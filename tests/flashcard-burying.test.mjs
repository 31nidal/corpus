import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {initFlashcardSchema} from '../server/flashcards/schema.mjs'
import {migrateFlashcards} from '../server/flashcards/migrations.mjs'
import {FlashcardRepository} from '../server/flashcards/repository.mjs'
import {defaultFsrsScheduler} from '../server/flashcards/fsrsScheduler.mjs'

test('sibling burying contrôlé : c1 révisée avec Again, c2 buried, c1 réapparaît à son dueAt FSRS', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys=ON;')
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT);
    CREATE TABLE study_documents (id TEXT PRIMARY KEY, user_id TEXT);
  `)
  initFlashcardSchema(db)
  migrateFlashcards(db)

  const userId = 'user-bury-1'
  db.prepare('INSERT INTO users VALUES(?, ?, ?)').run(userId, 'bury@test.com', 'Bury')

  const repo = new FlashcardRepository(db)
  const deck = repo.createDeck(userId, {name: 'Deck Test'})

  // Créer une note Cloze avec c1 et c2
  const note = repo.createNote(userId, {
    noteType: 'cloze',
    defaultDeckId: deck.id,
    fields: {text: 'Le {{c1::cœur}} et le {{c2::poumon}}.'},
  })

  assert.equal(note.cards.length, 2)
  for (const card of note.cards) assert.equal(card.noteId, note.id)
  assert.notEqual(note.cards[0].id, note.cards[1].id)

  const fixedNow = Date.now()

  // 1. Initialement, les deux cartes sont dues à Date.now().
  // La queue choisit déterministement le sibling éligible selon (due_at, id),
  // pas selon l'ordre du tableau note.cards (les IDs UUID sont aléatoires).
  const initialQueue = repo.reviewQueue(userId, deck.id, 10, 'Europe/Paris', fixedNow)
  assert.equal(initialQueue.length, 1)
  const c1 = note.cards.find(card => card.id === initialQueue[0].id)
  const c2 = note.cards.find(card => card.id !== initialQueue[0].id)
  assert.ok(c1)
  assert.ok(c2)

  // 2. Simuler la révision de c1 avec Again à 10:00:00
  const preview1 = defaultFsrsScheduler.createPreviewSnapshot(
    db.prepare('SELECT * FROM flashcard_reviews WHERE card_id=?').get(c1.id),
    fixedNow
  )
  // Candidat Again
  const againCandidate = preview1.candidates.again
  const next1 = defaultFsrsScheduler.applyReview(
    db.prepare('SELECT * FROM flashcard_reviews WHERE card_id=?').get(c1.id),
    'again',
    fixedNow,
    againCandidate
  )

  // Enregistrer la révision et le log
  db.prepare(`
    UPDATE flashcard_reviews
    SET state=?, due_at=?, interval_days=?, ease_factor=?, repetitions=?, lapses=?,
        last_rating=?, last_reviewed_at=?, fsrs_stability=?, fsrs_difficulty=?,
        fsrs_reps=?, fsrs_learning_steps=?, fsrs_scheduled_days=?, review_version=?
    WHERE card_id=?
  `).run(
    next1.state, next1.dueAt, next1.intervalDays, next1.easeFactor, next1.repetitions, next1.lapses,
    next1.lastRating, next1.lastReviewedAt, next1.stability, next1.difficulty,
    next1.fsrsReps, next1.learningSteps, next1.scheduledDays, next1.reviewVersion,
    c1.id
  )

  db.prepare(`
    INSERT INTO flashcard_review_logs(
      id, card_id, user_id, rating, reviewed_at, previous_due_at, previous_interval_days,
      next_due_at, next_interval_days, response_ms, previous_state, next_state,
      fsrs_difficulty, fsrs_stability, scheduled_days, elapsed_days, scheduler_version, scheduler_config_hash
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    'log-1', c1.id, userId, 'again', fixedNow,
    fixedNow, 0, next1.dueAt, next1.intervalDays, 1000,
    'new', next1.state, next1.difficulty, next1.stability, next1.scheduledDays, next1.elapsedDays,
    'fsrs-5.4.2', defaultFsrsScheduler.schedulerConfigHash
  )

  // 3. Immédiatement après à 10:00:05 :
  // c1 n'est pas encore due (son dueAt est dans ~10 minutes, learning step)
  // c2 est BURIED car un autre sibling (c1) a été révisé aujourd'hui !
  // La queue doit être vide !
  const queueAfterReview = repo.reviewQueue(userId, deck.id, 10, 'Europe/Paris', fixedNow + 5000)
  assert.equal(queueAfterReview.length, 0)

  // 4. Avancer le temps jusqu'au dueAt de c1 (ex: à 10:10:01)
  const timeWhenC1IsDue = next1.dueAt + 1000
  const queueWhenC1IsDue = repo.reviewQueue(userId, deck.id, 10, 'Europe/Paris', timeWhenC1IsDue)

  // c1 DOIT réapparaître selon son vrai échéancier FSRS (intra-journalier) !
  // Et c2 reste buried pour aujourd'hui !
  assert.equal(queueWhenC1IsDue.length, 1)
  assert.equal(queueWhenC1IsDue[0].id, c1.id)
  assert.equal(queueWhenC1IsDue[0].review.dueAt, next1.dueAt)
})

test('sibling burying avec filtre par deck : un sibling dans un autre deck ne vole pas rn=1', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys=ON;')
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT);
    CREATE TABLE study_documents (id TEXT PRIMARY KEY, user_id TEXT);
  `)
  initFlashcardSchema(db)
  migrateFlashcards(db)

  const userId = 'user-bury-2'
  db.prepare('INSERT INTO users VALUES(?, ?, ?)').run(userId, 'bury2@test.com', 'Bury2')

  const repo = new FlashcardRepository(db)
  const deckA = repo.createDeck(userId, {name: 'Deck A'})
  const deckB = repo.createDeck(userId, {name: 'Deck B'})

  // Créer une note Bidirectional dans deckA
  const note = repo.createNote(userId, {
    noteType: 'bidirectional',
    defaultDeckId: deckA.id,
    fields: {front: 'Question', back: 'Réponse'},
  })

  const forwardCard = note.cards.find(c => c.derivationKey === 'forward')
  const reverseCard = note.cards.find(c => c.derivationKey === 'reverse')

  // Déplacer reverseCard vers deckB
  db.prepare('UPDATE flashcards SET deck_id=? WHERE id=?').run(deckB.id, reverseCard.id)

  const now = Date.now()

  // Requête sur deck B uniquement :
  // Le CTE doit filtrer c.deck_id=deckB AVANT le window function
  // Donc reverseCard doit être présente et avoir rn=1 pour deck B
  const queueDeckB = repo.reviewQueue(userId, deckB.id, 10, 'Europe/Paris', now)
  assert.equal(queueDeckB.length, 1)
  assert.equal(queueDeckB[0].id, reverseCard.id)

  // Requête sur deck A uniquement :
  const queueDeckA = repo.reviewQueue(userId, deckA.id, 10, 'Europe/Paris', now)
  assert.equal(queueDeckA.length, 1)
  assert.equal(queueDeckA[0].id, forwardCard.id)
})


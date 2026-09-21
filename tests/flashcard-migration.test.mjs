import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {initFlashcardSchema} from '../server/flashcards/schema.mjs'
import {migrateFlashcards} from '../server/flashcards/migrations.mjs'
import {createFsrsScheduler} from '../server/flashcards/fsrsScheduler.mjs'

test('migration FSRS : idempotence, snapshot legacy, préservation intégrale et initialisation', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys=OFF;') // simplify isolated testing without full users/study tables

  // Initialisation schéma de base (legacy)
  initFlashcardSchema(db)

  const now = Date.UTC(2026, 8, 20, 10, 0, 0)
  const userId = 'user-legacy-1'
  const deckId = 'deck-1'

  db.prepare('INSERT INTO flashcard_decks(id, user_id, name, name_normalized, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)').run(
    deckId, userId, 'Cardio', 'cardio', new Date(now).toISOString(), new Date(now).toISOString()
  )

  // Insertion de cartes legacy variées
  const cards = [
    {id: 'card-new', state: 'new', due_at: now, interval_days: 0, repetitions: 0, lapses: 0, last_reviewed_at: null},
    {id: 'card-mature', state: 'review', due_at: now, interval_days: 25, repetitions: 4, lapses: 0, last_reviewed_at: now - 25 * 86400000},
    {id: 'card-learning', state: 'learning', due_at: now, interval_days: 0.5, repetitions: 1, lapses: 0, last_reviewed_at: now - 3600000},
    {id: 'card-lapsed', state: 'relearning', due_at: now, interval_days: 0.01, repetitions: 2, lapses: 2, last_reviewed_at: now - 600000},
    {id: 'card-logged', state: 'review', due_at: now, interval_days: 10, repetitions: 3, lapses: 0, last_reviewed_at: now - 10 * 86400000},
  ]

  for (const c of cards) {
    db.prepare('INSERT INTO flashcards(id, user_id, deck_id, front, back, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?)').run(
      c.id, userId, deckId, `Front ${c.id}`, `Back ${c.id}`, new Date(now).toISOString(), new Date(now).toISOString()
    )
    db.prepare('INSERT INTO flashcard_reviews(card_id, user_id, state, due_at, interval_days, repetitions, lapses, last_reviewed_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(
      c.id, userId, c.state, c.due_at, c.interval_days, c.repetitions, c.lapses, c.last_reviewed_at
    )
  }

  // Ajouter des logs historiques pour card-logged
  db.prepare('INSERT INTO flashcard_review_logs(id, card_id, user_id, rating, reviewed_at, previous_due_at, previous_interval_days, next_due_at, next_interval_days) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    'log-1', 'card-logged', userId, 'good', now - 20 * 86400000, now - 20 * 86400000, 0, now - 19 * 86400000, 1
  )
  db.prepare('INSERT INTO flashcard_review_logs(id, card_id, user_id, rating, reviewed_at, previous_due_at, previous_interval_days, next_due_at, next_interval_days) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
    'log-2', 'card-logged', userId, 'good', now - 19 * 86400000, now - 19 * 86400000, 1, now - 16 * 86400000, 3
  )

  const scheduler = createFsrsScheduler({enableFuzz: false})

  // 1ère exécution de la migration
  migrateFlashcards(db, scheduler)

  // Vérifier que la version est enregistrée
  const versionRow = db.prepare('SELECT version FROM flashcard_migrations WHERE version=1').get()
  assert.ok(versionRow)

  // Vérifier la table des snapshots legacy
  const backups = db.prepare('SELECT * FROM flashcard_legacy_reviews').all()
  assert.equal(backups.length, cards.length)

  // Vérifier les données migrées pour chaque type de carte
  const rowNew = db.prepare('SELECT * FROM flashcard_reviews WHERE card_id=?').get('card-new')
  assert.equal(rowNew.fsrs_origin, 'new')
  assert.equal(rowNew.fsrs_stability, 0)
  assert.equal(rowNew.fsrs_reps, 0)

  const rowMature = db.prepare('SELECT * FROM flashcard_reviews WHERE card_id=?').get('card-mature')
  assert.equal(rowMature.fsrs_origin, 'bootstrap_heuristic_mature')
  assert.equal(rowMature.fsrs_stability, 25)
  assert.ok(rowMature.fsrs_difficulty > 0)

  const rowLogged = db.prepare('SELECT * FROM flashcard_reviews WHERE card_id=?').get('card-logged')
  assert.equal(rowLogged.fsrs_origin, 'replayed_available_history')
  assert.ok(rowLogged.fsrs_stability > 0)
  assert.ok(rowLogged.fsrs_reps >= 2)

  // Vérifier que la table flashcard_review_previews existe et est vide
  const previewCount = db.prepare('SELECT COUNT(*) count FROM flashcard_review_previews').get().count
  assert.equal(previewCount, 0)

  // 2ème exécution (Idempotence)
  migrateFlashcards(db, scheduler)

  const countAfter = db.prepare('SELECT COUNT(*) count FROM flashcard_reviews').get().count
  assert.equal(countAfter, cards.length)
  const backupsAfter = db.prepare('SELECT COUNT(*) count FROM flashcard_legacy_reviews').get().count
  assert.equal(backupsAfter, cards.length)

  db.close()
})


import {FLASHCARD_NOTE_TYPES} from '../server/flashcards/noteTypes.mjs'
import {FlashcardRepository} from '../server/flashcards/repository.mjs'
import {draftContentHash, draftEvidenceSignals, isSafeDraft, SAFE_DRAFT_RULE, REJECTED_DRAFT_RETENTION_MS} from '../server/flashcards/review/policy.mjs'
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

test('TEST CRITIQUE : boot et migration d’une ancienne base de production Phase 1', async () => {
  const {createHash} = await import('node:crypto')
  const {mkdtempSync, rmSync} = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const {initStudySchema} = await import('../server/study.mjs')
  const {createFlashcardHandler} = await import('../server/flashcards/handler.mjs')

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'corpus-legacy-prod-'))
  try {
    const dbPath = path.join(tempDir, 'mycorpus.sqlite')
    const oldDb = new DatabaseSync(dbPath)

    // Schéma exact Phase 1 (avant Phase 2A)
    oldDb.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        recovery TEXT NOT NULL,
        password_enabled INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        expires INTEGER
      );
      CREATE TABLE study_documents (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ready',
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE flashcard_decks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        name_normalized TEXT NOT NULL,
        description TEXT,
        subject TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, name_normalized)
      );
      CREATE TABLE flashcards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deck_id TEXT NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        subject TEXT,
        chapter TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]',
        visual_json TEXT,
        source_type TEXT NOT NULL DEFAULT 'manual',
        source_course_id TEXT,
        source_document_id TEXT REFERENCES study_documents(id) ON DELETE SET NULL,
        source_section_id TEXT,
        source_locator_json TEXT,
        source_excerpt TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE flashcard_reviews (
        card_id TEXT PRIMARY KEY REFERENCES flashcards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        state TEXT NOT NULL DEFAULT 'new',
        due_at INTEGER NOT NULL,
        interval_days REAL NOT NULL DEFAULT 0,
        ease_factor REAL NOT NULL DEFAULT 2.5,
        repetitions INTEGER NOT NULL DEFAULT 0,
        lapses INTEGER NOT NULL DEFAULT 0,
        last_rating TEXT,
        last_reviewed_at INTEGER,
        fsrs_stability REAL,
        fsrs_difficulty REAL,
        fsrs_reps INTEGER DEFAULT 0,
        fsrs_learning_steps INTEGER NOT NULL DEFAULT 0,
        fsrs_scheduled_days REAL NOT NULL DEFAULT 0,
        review_version INTEGER NOT NULL DEFAULT 0,
        fsrs_origin TEXT
      );
      CREATE TABLE flashcard_review_logs (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating TEXT NOT NULL,
        reviewed_at INTEGER NOT NULL,
        previous_due_at INTEGER NOT NULL,
        previous_interval_days REAL NOT NULL,
        next_due_at INTEGER NOT NULL,
        next_interval_days REAL NOT NULL,
        response_ms INTEGER,
        previous_state TEXT,
        next_state TEXT,
        fsrs_difficulty REAL,
        fsrs_stability REAL,
        scheduled_days REAL,
        elapsed_days REAL,
        scheduler_version TEXT,
        scheduler_config_hash TEXT,
        scheduler_data_json TEXT
      );
      CREATE TABLE flashcard_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
      INSERT INTO flashcard_migrations VALUES (1, 1726800000000);
    `)

    const now = Date.now()
    const userId = 'u-legacy-prod'
    const deckId = 'd-legacy-cardio'
    const cardId = 'c-legacy-vg'
    const logId = 'l-legacy-1'
    const token = 'session_legacy_prod_token'
    const hashedToken = createHash('sha256').update(token).digest('hex')

    oldDb.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, 1)').run(userId, 'legacy@example.com', 'Dr Legacy', 'hash', 'rec')
    oldDb.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hashedToken, userId, now + 86400000)
    oldDb.prepare('INSERT INTO flashcard_decks VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      deckId, userId, 'Cardiologie', 'cardiologie', 'Physiologie cardiaque', 'Cardio',
      new Date(now - 86400000).toISOString(), new Date(now - 86400000).toISOString()
    )
    oldDb.prepare(`
      INSERT INTO flashcards (id, user_id, deck_id, front, back, subject, chapter, tags_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cardId, userId, deckId,
      'Quel est le rôle mécanique principal du VG ?',
      'Éjecter le sang oxygéné dans la circulation systémique à haute pression.',
      'Cardio', 'Ventricules', '["hémodynamique"]',
      new Date(now - 86400000).toISOString(), new Date(now - 86400000).toISOString()
    )
    oldDb.prepare(`
      INSERT INTO flashcard_reviews (card_id, user_id, state, due_at, interval_days, ease_factor, repetitions, lapses, last_rating, last_reviewed_at, fsrs_stability, fsrs_difficulty, fsrs_reps, fsrs_learning_steps, fsrs_scheduled_days, review_version, fsrs_origin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cardId, userId, 'review', now - 1000, 10, 2.5, 3, 0, 'good', now - 10 * 86400000,
      10.5, 4.8, 3, 0, 10, 1, 'fsrs'
    )
    oldDb.prepare(`
      INSERT INTO flashcard_review_logs (id, card_id, user_id, rating, reviewed_at, previous_due_at, previous_interval_days, next_due_at, next_interval_days, response_ms, previous_state, next_state, fsrs_difficulty, fsrs_stability, scheduled_days, elapsed_days, scheduler_version, scheduler_config_hash, scheduler_data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId, cardId, userId, 'good', now - 10 * 86400000, now - 20 * 86400000, 5, now - 1000, 10,
      1250, 'learning', 'review', 4.8, 10.5, 10, 10, '6.0.0', 'hash', '{}'
    )

    oldDb.close()

    // 1. Exécuter le boot applicatif (comme dans createFlashcardHandler)
    const handler = createFlashcardHandler({
      ACCOUNT_DATA_DIR: tempDir,
      RAILWAY_VOLUME_MOUNT_PATH: tempDir,
      APP_ORIGIN: 'http://localhost:5173',
    })

    const request = async (pathname, method = 'GET', body = null) => {
      let statusCode = 0, headers = {}, rawBody = ''
      const req = {
        url: pathname,
        method,
        headers: {
          cookie: `mycorpus_session=${token}`,
          'x-mycorpus-request': '1',
          'content-type': 'application/json',
          host: 'localhost:5173',
        },
        async *[Symbol.asyncIterator]() {
          if (body) yield Buffer.from(JSON.stringify(body))
        },
      }
      const res = {
        writeHead(status, hdrs) {
          statusCode = status
          headers = hdrs
        },
        end(data) {
          rawBody = data ? String(data) : ''
        },
      }
      await handler(req, res)
      return {status: statusCode, headers, body: rawBody ? JSON.parse(rawBody) : {}}
    }

    // 2. Vérifier les routes de base
    const decksRes = await request('/api/flashcards/decks')
    assert.equal(decksRes.status, 200, 'GET /decks doit réussir avec 200')
    assert.equal(decksRes.body.decks.length, 1)
    assert.equal(decksRes.body.decks[0].name, 'Cardiologie')

    const cardsRes = await request('/api/flashcards/cards?limit=100')
    assert.equal(cardsRes.status, 200, 'GET /cards doit réussir avec 200')
    assert.equal(cardsRes.body.cards.length, 1)
    const card = cardsRes.body.cards[0]
    assert.equal(card.id, cardId, 'L’ancienne Card conserve exactement son ID')
    assert.equal(card.front, 'Quel est le rôle mécanique principal du VG ?')
    assert.equal(card.back, 'Éjecter le sang oxygéné dans la circulation systémique à haute pression.')
    assert.equal(card.deckId, deckId, 'Le deck_id est conservé')
    assert.equal(card.noteId, null, 'Le noteId est NULL pour les cartes issues de Phase 1')
    assert.equal(card.review?.state, 'review', 'L’état de révision FSRS est conservé')
    assert.equal(card.review?.intervalDays, 10)

    const statsRes = await request('/api/flashcards/stats')
    assert.equal(statsRes.status, 200, 'GET /stats doit réussir avec 200')
    assert.equal(statsRes.body.stats.total, 1)
    assert.equal(statsRes.body.stats.dueToday, 1)
    assert.equal(statsRes.body.stats.reviews, 1)

    const reviewRes = await request('/api/flashcards/review')
    assert.equal(reviewRes.status, 200, 'GET /review doit réussir avec 200')
    assert.equal(reviewRes.body.cards.length, 1)
    assert.equal(reviewRes.body.cards[0].id, cardId)

    // Vérifier directement en DB les colonnes et index
    const checkDb = new DatabaseSync(dbPath)
    const cols = new Set(checkDb.prepare('PRAGMA table_info(flashcards)').all().map(c => c.name))
    assert.ok(cols.has('note_id'), 'La colonne note_id doit exister après migration')
    assert.ok(cols.has('derivation_key'), 'La colonne derivation_key doit exister')
    assert.ok(cols.has('card_type'), 'La colonne card_type doit exister')

    const indexes = checkDb.prepare('PRAGMA index_list(flashcards)').all().map(i => i.name)
    assert.ok(indexes.includes('flashcards_note_id'), 'L’index flashcards_note_id doit être présent')
    assert.ok(indexes.includes('flashcards_note_derivation'), 'L’index flashcards_note_derivation doit être présent')
    checkDb.close()
  } finally {
    rmSync(tempDir, {recursive: true, force: true})
  }
})

test('TEST DE RETRY APRÈS ÉCHEC D’INIT : getDb ne cache pas une instance défaillante', async () => {
  const {mkdtempSync, rmSync} = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const {createFlashcardHandler} = await import('../server/flashcards/handler.mjs')

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'corpus-retry-test-'))
  try {
    // Configurer un scheduler qui échoue la première fois pendant reconstructMemory
    let failFirstTime = true
    const flappyScheduler = {
      defaultParameters: {},
      schedulerConfigHash: 'test-hash',
      reconstructMemory() {
        if (failFirstTime) {
          throw new Error('Simulation panne transitoire FSRS pendant migration')
        }
        return {origin: 'new', stability: 0, difficulty: 0, fsrsReps: 0, learningSteps: 0}
      },
      applyReview() {},
      createPreviewSnapshot() {},
    }

    // Créer une DB avec une review nécessitant reconstruction
    const dbPath = path.join(tempDir, 'mycorpus.sqlite')
    const initDb = new DatabaseSync(dbPath)
    initDb.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT);
      CREATE TABLE study_documents (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, filename TEXT, file_size INTEGER, created_at TEXT, updated_at TEXT);
      CREATE TABLE flashcard_decks (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, name_normalized TEXT, created_at TEXT, updated_at TEXT);
      CREATE TABLE flashcards (id TEXT PRIMARY KEY, user_id TEXT, deck_id TEXT, front TEXT, back TEXT, created_at TEXT, updated_at TEXT);
      CREATE TABLE flashcard_reviews (card_id TEXT PRIMARY KEY, user_id TEXT, state TEXT, due_at INTEGER, repetitions INTEGER, lapses INTEGER, last_rating TEXT);
      CREATE TABLE flashcard_review_logs (id TEXT PRIMARY KEY, card_id TEXT, user_id TEXT, rating TEXT, reviewed_at INTEGER, previous_due_at INTEGER, previous_interval_days REAL, next_due_at INTEGER, next_interval_days REAL);
      INSERT INTO users VALUES ('u1', 'u@test.com', 'Test User');
      INSERT INTO flashcard_decks VALUES ('d1', 'u1', 'Deck', 'deck', '2026-09-20', '2026-09-20');
      INSERT INTO flashcards VALUES ('c1', 'u1', 'd1', 'F', 'B', '2026-09-20', '2026-09-20');
      INSERT INTO flashcard_reviews VALUES ('c1', 'u1', 'new', 1000, 0, 0, null);
    `)
    initDb.close()

    const handler = createFlashcardHandler({
      ACCOUNT_DATA_DIR: tempDir,
      RAILWAY_VOLUME_MOUNT_PATH: tempDir,
    }, {scheduler: flappyScheduler})

    const callHandler = async () => {
      let statusCode = 0, bodyText = ''
      await handler(
        {url: '/api/flashcards/decks', method: 'GET', headers: {}},
        {writeHead(s) { statusCode = s }, end(d) { bodyText = String(d) }}
      )
      return {status: statusCode, body: JSON.parse(bodyText)}
    }

    // 1ère tentative : doit échouer avec 500
    const res1 = await callHandler()
    assert.equal(res1.status, 500, 'Doit renvoyer 500 lors de la panne d’init')
    assert.equal(res1.body.error, 'Service flashcards indisponible. Réessayez dans quelques instants.')

    // 2ème tentative après résolution de la panne : getDb() doit rejouer l’init et réussir
    failFirstTime = false
    const res2 = await callHandler()
    assert.equal(res2.status, 401, 'Doit passer l’init et renvoyer 401 (non authentifié) au lieu de rester bloqué sur une DB non migrée')
  } finally {
    rmSync(tempDir, {recursive: true, force: true})
  }
})

test('TEST DB NEUVE : initialisation complète, migrations 1..5 et API fonctionnelle', async () => {
  const {createHash} = await import('node:crypto')
  const {mkdtempSync, rmSync} = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const {createFlashcardHandler} = await import('../server/flashcards/handler.mjs')

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'corpus-fresh-db-'))
  try {
    const dbPath = path.join(tempDir, 'mycorpus.sqlite')

    // Initialiser table users de base pour le compte
    const initDb = new DatabaseSync(dbPath)
    initDb.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        password TEXT NOT NULL, recovery TEXT NOT NULL, password_enabled INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE sessions (
        token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, expires INTEGER
      );
    `)
    const userId = 'u-fresh'
    const token = 'session_fresh_token'
    const hashedToken = createHash('sha256').update(token).digest('hex')
    initDb.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, 1)').run(userId, 'fresh@example.com', 'Fresh User', 'pwd', 'rec')
    initDb.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hashedToken, userId, Date.now() + 86400000)
    initDb.close()

    const handler = createFlashcardHandler({
      ACCOUNT_DATA_DIR: tempDir,
      RAILWAY_VOLUME_MOUNT_PATH: tempDir,
      APP_ORIGIN: 'http://localhost:5173',
    })

    const request = async (pathname, method = 'GET', body = null) => {
      let statusCode = 0, rawBody = ''
      const req = {
        url: pathname,
        method,
        headers: {
          cookie: `mycorpus_session=${token}`,
          'x-mycorpus-request': '1',
          'content-type': 'application/json',
          origin: 'http://localhost:5173',
          host: 'localhost:5173',
        },
        async *[Symbol.asyncIterator]() {
          if (body) yield Buffer.from(JSON.stringify(body))
        },
      }
      const res = {
        writeHead(s) { statusCode = s },
        end(d) { rawBody = d ? String(d) : '' },
      }
      await handler(req, res)
      return {status: statusCode, body: rawBody ? JSON.parse(rawBody) : {}}
    }

    // Requêtes sur DB fraîche
    const decksRes = await request('/api/flashcards/decks')
    assert.equal(decksRes.status, 200)
    assert.deepEqual(decksRes.body.decks, [])

    const cardsRes = await request('/api/flashcards/cards?limit=50')
    assert.equal(cardsRes.status, 200)
    assert.deepEqual(cardsRes.body.cards, [])

    const statsRes = await request('/api/flashcards/stats')
    assert.equal(statsRes.status, 200)
    assert.equal(statsRes.body.stats.total, 0)

    const reviewRes = await request('/api/flashcards/review')
    assert.equal(reviewRes.status, 200)
    assert.deepEqual(reviewRes.body.cards, [])

    // Création d’un deck et d’une carte
    const createDeckRes = await request('/api/flashcards/decks', 'POST', {name: 'Anatomie Générale'})
    assert.equal(createDeckRes.status, 201)
    const deckId = createDeckRes.body.deck.id

    const createCardRes = await request('/api/flashcards/cards', 'POST', {
      deckId,
      front: 'Combien d’os comporte le squelette humain adulte ?',
      back: '206 os constants.',
    })
    assert.equal(createCardRes.status, 201)

    // Vérifier que les migrations 1..5 sont bien enregistrées
    const checkDb = new DatabaseSync(dbPath)
    const versions = checkDb.prepare('SELECT version FROM flashcard_migrations ORDER BY version ASC').all().map(r => r.version)
    assert.deepEqual(versions, [1, 2, 3, 4, 5], 'Les 5 migrations doivent être enregistrées sur une DB neuve')
    checkDb.close()
  } finally {
    rmSync(tempDir, {recursive: true, force: true})
  }
})




function reviewDatabase() {
  const db = new DatabaseSync(':memory:')
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE users(id TEXT PRIMARY KEY);
    CREATE TABLE study_documents(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE study_sections(id TEXT PRIMARY KEY,document_id TEXT REFERENCES study_documents(id) ON DELETE CASCADE);
    INSERT INTO users VALUES('owner'),('other');
    INSERT INTO study_documents VALUES('doc','owner'),('doc-other','owner'),('doc-bob','other');
    INSERT INTO study_sections VALUES('section','doc');`)
  initFlashcardSchema(db)
  migrateFlashcards(db)
  return db
}

function insertDraft(db, id, overrides = {}) {
  const value = {
    user:'owner', document:'doc', section:'section', page:2, type:'basic',
    front:'Quelle est la fonction du nerf ?', back:'Une réponse sourcée.', excerpt:'Une preuve précise.',
    status:'pending', created:Date.UTC(2026,9,8), ...overrides,
  }
  const hash = draftContentHash(value.front,value.excerpt)
  return db.prepare(`INSERT OR IGNORE INTO flashcard_drafts
    (id,user_id,document_id,section_id,page,note_type,front,back,fields_json,source_excerpt,content_hash,status,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,value.user,value.document,value.section,value.page,value.type,value.front,value.back,
    JSON.stringify({front:value.front,back:value.back}),value.excerpt,hash,value.status,value.created,value.created,
  ).changes
}

test('migration brouillons : versions explicites, idempotence et cascade document/compte', () => {
  const db = reviewDatabase()
  try {
    insertDraft(db,'draft')
    const before = {...db.prepare('SELECT * FROM flashcard_drafts').get()}
    migrateFlashcards(db)
    assert.deepEqual(db.prepare('SELECT version FROM flashcard_migrations ORDER BY version').all().map(r=>r.version),[1,2,3,4,5])
    assert.deepEqual({...db.prepare('SELECT * FROM flashcard_drafts').get()},before)
    assert.equal(db.prepare("SELECT count(*) n FROM pragma_table_info('flashcard_drafts') WHERE name='high_confidence'").get().n,0)
    db.exec("DELETE FROM study_sections WHERE id='section'")
    assert.equal(db.prepare('SELECT section_id FROM flashcard_drafts').get().section_id,null)
    db.exec("DELETE FROM study_documents WHERE id='doc'")
    assert.equal(db.prepare('SELECT count(*) n FROM flashcard_drafts').get().n,0)
    insertDraft(db,'other-draft',{document:'doc-other',section:null})
    db.exec("DELETE FROM users WHERE id='owner'")
    assert.equal(db.prepare('SELECT count(*) n FROM flashcard_drafts').get().n,0)
  } finally {db.close()}
})

test('brouillons : hash accentué et dédoublonnage isolé, y compris les rejets', () => {
  const db = reviewDatabase()
  try {
    const front='Quel rôle du nerf médian ?',excerpt='Le nerf médian innerve ce muscle.'
    assert.equal(draftContentHash(front,excerpt),draftContentHash('  QUEL RÔLE  du nerf me\u0301dian ? ', 'Le nerf\n médian innerve ce muscle.'))
    assert.notEqual(draftContentHash(front,excerpt),draftContentHash(front.replace('rôle','role'),excerpt))
    assert.notEqual(draftContentHash('a','bc'),draftContentHash('ab','c'))
    assert.equal(insertDraft(db,'first',{front,excerpt}),1)
    assert.equal(insertDraft(db,'repeated',{front,excerpt}),0)
    db.exec("UPDATE flashcard_drafts SET status='rejected',rejected_from='pending',rejected_at=updated_at WHERE id='first'")
    assert.equal(insertDraft(db,'rejected-again',{front,excerpt}),0)
    assert.equal(insertDraft(db,'other-document',{front,excerpt,document:'doc-other',section:null}),1)
    assert.equal(insertDraft(db,'other-user',{front,excerpt,user:'other',document:'doc-bob',section:null}),1)
    assert.equal(db.prepare('SELECT count(*) n FROM flashcard_drafts').get().n,3)
  } finally {db.close()}
})

test('brouillons : types réels, statuts, provenance et dates en millisecondes', () => {
  const db=reviewDatabase()
  try {
    insertDraft(db,'checked')
    for (const type of FLASHCARD_NOTE_TYPES) {
      db.prepare("UPDATE flashcard_drafts SET note_type=? WHERE id='checked'").run(type)
    }
    for (const sql of [
      "UPDATE flashcard_drafts SET note_type='unknown'",
      "UPDATE flashcard_drafts SET status='unknown'",
      "UPDATE flashcard_drafts SET rejected_from='accepted'",
      'UPDATE flashcard_drafts SET page=0',
      'UPDATE flashcard_drafts SET verbatim_proof=2',
      'UPDATE flashcard_drafts SET confidence=1.1',
      "UPDATE flashcard_drafts SET created_at='2026-10-08T00:00:00Z'",
      'UPDATE flashcard_drafts SET updated_at=created_at-1',
      'UPDATE flashcard_drafts SET rejected_at=created_at-1',
      "UPDATE flashcard_drafts SET content_hash='invalid'",
    ]) assert.throws(()=>db.exec(sql),sql)
    for (const from of [null,'pending','edited']) db.prepare('UPDATE flashcard_drafts SET rejected_from=?').run(from)
    const date=Date.UTC(2026,9,8)+1000
    db.prepare('UPDATE flashcard_drafts SET rejected_at=?,updated_at=?').run(date,date)
    const row=db.prepare('SELECT * FROM flashcard_drafts').get()
    assert.equal(row.rejected_at,date)
    assert.equal(new Date(row.created_at).toISOString(),'2026-10-08T00:00:00.000Z')
    assert.equal(REJECTED_DRAFT_RETENTION_MS,30*86400000)
  } finally {db.close()}
})

test('brouillon accepté : note supprimée, remplacement possible et unicité conservée', () => {
  const db=reviewDatabase(),repo=new FlashcardRepository(db)
  try {
    insertDraft(db,'accepted')
    insertDraft(db,'another',{front:'Autre question'})
    const deck=repo.createDeck('owner',{name:'Cours'})
    const value={defaultDeckId:deck.id,noteType:'basic',fields:{front:'Q',back:'A'},source:{type:'study_document',documentId:'doc'}}
    const accept = () => {
      db.exec('BEGIN IMMEDIATE')
      try {
        const draft=db.prepare("SELECT * FROM flashcard_drafts WHERE id='accepted' AND user_id='owner'").get()
        const note=draft.accepted_note_id ? repo.note('owner',draft.accepted_note_id) : repo.createNoteRows('owner',value)
        db.prepare("UPDATE flashcard_drafts SET status='accepted',accepted_note_id=? WHERE id='accepted' AND user_id='owner'").run(note.id)
        db.exec('COMMIT');return note
      } catch(error) {db.exec('ROLLBACK');throw error}
    }
    const original=accept()
    assert.equal(accept().id,original.id)
    assert.equal(db.prepare('SELECT count(*) n FROM flashcards').get().n,1)
    assert.throws(()=>db.prepare("UPDATE flashcard_drafts SET accepted_note_id=? WHERE id='another'").run(original.id))
    repo.deleteNote('owner',original.id,original.noteVersion)
    const deleted=db.prepare("SELECT status,accepted_note_id FROM flashcard_drafts WHERE id='accepted'").get()
    assert.equal(deleted.status,'accepted');assert.equal(deleted.accepted_note_id,null)
    const replacement=accept()
    assert.notEqual(replacement.id,original.id)
    assert.equal(accept().id,replacement.id)
    assert.equal(db.prepare('SELECT count(*) n FROM flashcards').get().n,1)
    assert.equal(repo.card('owner',replacement.cards[0].id).review.state,'new')
  } finally {db.close()}
})

test('critère sûr : seuil exact, preuve verbatim, type compatible et statut non édité', () => {
  assert.equal(SAFE_DRAFT_RULE.minConfidence,0.95)
  const safe={noteType:'basic',status:'pending',confidence:0.95,verbatimProof:true}
  assert.equal(isSafeDraft(safe),true)
  for (const change of [{confidence:0.949},{confidence:NaN},{verbatimProof:false},{status:'edited'},{status:'rejected'},{status:'accepted'},{noteType:'typed'},{noteType:'bidirectional'},{noteType:'image_occlusion'},{noteType:'atlas_3d'}]) {
    assert.equal(isSafeDraft({...safe,...change}),false,JSON.stringify(change))
  }
  assert.equal(isSafeDraft({...safe,noteType:'reverse'}),true)
  assert.equal(isSafeDraft({...safe,noteType:'cloze'}),true)
  const excerpt='Le nerf médian innerve le muscle pronateur rond.'
  const section={id:'source',startPage:2,endPage:3,content:excerpt}
  assert.deepEqual(draftEvidenceSignals({source:{excerpt}},section),{confidence:0.97,verbatimProof:true})
  assert.deepEqual(draftEvidenceSignals({source:{excerpt:excerpt.replace('médian','median')}},section),{confidence:0,verbatimProof:false})
  assert.deepEqual(draftEvidenceSignals({source:{excerpt:'Le débit cardiaque vaut cinq litres par minute.'}},{...section,content:'Le débit cardiaque vaut cinq litres par minute.'}),{confidence:0,verbatimProof:true})
})

import {defaultFsrsScheduler} from './fsrsScheduler.mjs'

const REVIEW_COLUMNS = {
  fsrs_stability: 'REAL',
  fsrs_difficulty: 'REAL',
  fsrs_reps: 'INTEGER',
  fsrs_learning_steps: 'INTEGER NOT NULL DEFAULT 0',
  fsrs_scheduled_days: 'REAL NOT NULL DEFAULT 0',
  review_version: 'INTEGER NOT NULL DEFAULT 0',
  fsrs_origin: 'TEXT',
}

const LOG_COLUMNS = {
  previous_state: 'TEXT',
  next_state: 'TEXT',
  fsrs_difficulty: 'REAL',
  fsrs_stability: 'REAL',
  scheduled_days: 'REAL',
  elapsed_days: 'REAL',
  scheduler_version: 'TEXT',
  scheduler_config_hash: 'TEXT',
  scheduler_data_json: 'TEXT',
}

const LEGACY_FIELDS = [
  'state',
  'due_at',
  'interval_days',
  'ease_factor',
  'repetitions',
  'lapses',
  'last_rating',
  'last_reviewed_at',
]

export function migrateFlashcards(db, scheduler = defaultFsrsScheduler) {
  db.exec('BEGIN IMMEDIATE')
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS flashcard_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS flashcard_legacy_reviews (
        card_id TEXT PRIMARY KEY REFERENCES flashcards(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        snapshot_json TEXT NOT NULL,
        initialization TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS flashcard_review_previews (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
        review_version INTEGER NOT NULL,
        preview_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        candidates_json TEXT NOT NULL,
        scheduler_version TEXT NOT NULL,
        scheduler_config_hash TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS flashcard_previews_card_user ON flashcard_review_previews(card_id, user_id);
      CREATE INDEX IF NOT EXISTS flashcard_previews_expires ON flashcard_review_previews(expires_at);
    `)

    if (!db.prepare('SELECT 1 FROM flashcard_migrations WHERE version=1').get()) {
      for (const [table, columns] of [
        ['flashcard_reviews', REVIEW_COLUMNS],
        ['flashcard_review_logs', LOG_COLUMNS],
      ]) {
        const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name))
        for (const [colName, colType] of Object.entries(columns)) {
          if (!existing.has(colName)) {
            db.exec(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colType}`)
          }
        }
      }

      const historyStmt = db.prepare(
        'SELECT rating, reviewed_at FROM flashcard_review_logs WHERE card_id=? AND user_id=? ORDER BY reviewed_at ASC, rowid ASC'
      )
      const updateStmt = db.prepare(
        `UPDATE flashcard_reviews
         SET fsrs_stability=?, fsrs_difficulty=?, fsrs_reps=?, fsrs_learning_steps=?, fsrs_scheduled_days=?, fsrs_origin=?
         WHERE card_id=? AND user_id=?`
      )
      const backupStmt = db.prepare(
        'INSERT OR IGNORE INTO flashcard_legacy_reviews VALUES(?, ?, ?, ?)'
      )

      const unmigratedRows = db.prepare(
        'SELECT * FROM flashcard_reviews WHERE fsrs_reps IS NULL OR fsrs_origin IS NULL'
      ).all()

      for (const row of unmigratedRows) {
        const logs = historyStmt.all(row.card_id, row.user_id)
        const memory = scheduler.reconstructMemory(row, logs)
        const snapshot = JSON.stringify(Object.fromEntries(LEGACY_FIELDS.map(k => [k, row[k]])))

        backupStmt.run(row.card_id, row.user_id, snapshot, memory.origin)
        updateStmt.run(
          memory.stability,
          memory.difficulty,
          memory.fsrsReps,
          memory.learningSteps,
          row.interval_days || 0,
          memory.origin,
          row.card_id,
          row.user_id
        )
      }

      db.prepare('INSERT INTO flashcard_migrations VALUES(1, ?)').run(Date.now())
    }

    if (!db.prepare('SELECT 1 FROM flashcard_migrations WHERE version=2').get()) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS flashcard_notes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          default_deck_id TEXT REFERENCES flashcard_decks(id) ON DELETE SET NULL,
          note_type TEXT NOT NULL,
          title TEXT,
          fields_json TEXT NOT NULL,
          suppressed_derivations_json TEXT NOT NULL DEFAULT '[]',
          subject TEXT,
          chapter TEXT,
          tags_json TEXT NOT NULL DEFAULT '[]',
          source_type TEXT NOT NULL DEFAULT 'manual',
          source_course_id TEXT,
          source_document_id TEXT REFERENCES study_documents(id) ON DELETE SET NULL,
          source_section_id TEXT,
          source_locator_json TEXT,
          source_excerpt TEXT,
          visual_json TEXT,
          schema_version INTEGER NOT NULL DEFAULT 1,
          note_version INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS flashcard_notes_user ON flashcard_notes(user_id, updated_at DESC);
        CREATE INDEX IF NOT EXISTS flashcard_notes_default_deck ON flashcard_notes(default_deck_id);
      `)

      const cardCols = {
        note_id: 'TEXT REFERENCES flashcard_notes(id) ON DELETE CASCADE',
        derivation_key: 'TEXT',
        card_type: "TEXT NOT NULL DEFAULT 'basic'",
        typed_target: 'TEXT',
        accepted_answers_json: 'TEXT',
      }
      const existingCardCols = new Set(db.prepare('PRAGMA table_info(flashcards)').all().map(c => c.name))
      for (const [colName, colDef] of Object.entries(cardCols)) {
        if (!existingCardCols.has(colName)) {
          db.exec(`ALTER TABLE flashcards ADD COLUMN ${colName} ${colDef}`)
        }
      }

      db.exec(`
        CREATE INDEX IF NOT EXISTS flashcards_note_id ON flashcards(note_id);
        CREATE UNIQUE INDEX IF NOT EXISTS flashcards_note_derivation ON flashcards(note_id, derivation_key) WHERE note_id IS NOT NULL;
      `)

      db.prepare('INSERT INTO flashcard_migrations VALUES(2, ?)').run(Date.now())
    }

    if (!db.prepare('SELECT 1 FROM flashcard_migrations WHERE version=3').get()) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS flashcard_generation_receipts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          kind TEXT NOT NULL,
          source_json TEXT NOT NULL,
          source_text TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS flashcard_generation_receipts_user ON flashcard_generation_receipts(user_id, expires_at);
      `)
      db.prepare('INSERT INTO flashcard_migrations VALUES(3, ?)').run(Date.now())
    }

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}


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

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}


export function initFlashcardSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS flashcard_save_requests (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      request_id TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      response_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY(user_id, request_id)
    );
    CREATE TABLE IF NOT EXISTS flashcard_decks (
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
    CREATE INDEX IF NOT EXISTS flashcard_decks_user ON flashcard_decks(user_id, updated_at DESC);

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

    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      deck_id TEXT NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
      note_id TEXT REFERENCES flashcard_notes(id) ON DELETE CASCADE,
      derivation_key TEXT,
      card_type TEXT NOT NULL DEFAULT 'basic',
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      typed_target TEXT,
      accepted_answers_json TEXT,
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
    CREATE INDEX IF NOT EXISTS flashcards_user_deck ON flashcards(user_id, deck_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS flashcards_user_source_course ON flashcards(user_id, source_course_id);
    CREATE INDEX IF NOT EXISTS flashcards_user_source_document ON flashcards(user_id, source_document_id);
    CREATE INDEX IF NOT EXISTS flashcards_note_id ON flashcards(note_id);
    CREATE UNIQUE INDEX IF NOT EXISTS flashcards_note_derivation ON flashcards(note_id, derivation_key) WHERE note_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS flashcard_reviews (
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
    CREATE INDEX IF NOT EXISTS flashcard_reviews_due ON flashcard_reviews(user_id, due_at);

    CREATE TABLE IF NOT EXISTS flashcard_review_logs (
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
    CREATE INDEX IF NOT EXISTS flashcard_logs_user_date ON flashcard_review_logs(user_id, reviewed_at DESC);
    CREATE INDEX IF NOT EXISTS flashcard_logs_card ON flashcard_review_logs(card_id, reviewed_at DESC);

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
}

/** Additive QCM tables. No legacy question, card or FSRS row is rewritten. */
export function migrateStudyQuestions(db, now) {
  if (db.prepare('SELECT 1 FROM study_v2_migrations WHERE version=3').get()) return
  db.exec(`
    CREATE TABLE study_v2_question_sets (
      id TEXT PRIMARY KEY, document_id TEXT NOT NULL, user_id TEXT NOT NULL,
      title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 150),
      source_version INTEGER NOT NULL CHECK(source_version>=1),
      scope_json TEXT NOT NULL CHECK(json_valid(scope_json)),
      settings_json TEXT NOT NULL CHECK(json_valid(settings_json)),
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(id,document_id,user_id),
      FOREIGN KEY(document_id,user_id) REFERENCES study_documents(id,user_id) ON DELETE CASCADE
    );
    CREATE INDEX study_v2_question_sets_owner ON study_v2_question_sets(user_id,document_id,created_at);
    CREATE TABLE study_v2_questions (
      id TEXT PRIMARY KEY, set_id TEXT NOT NULL, document_id TEXT NOT NULL, user_id TEXT NOT NULL,
      content_json TEXT NOT NULL CHECK(json_valid(content_json)),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','validated','rejected')),
      version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
      validation_json TEXT NOT NULL CHECK(json_valid(validation_json)),
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      FOREIGN KEY(set_id,document_id,user_id) REFERENCES study_v2_question_sets(id,document_id,user_id) ON DELETE CASCADE
    );
    CREATE INDEX study_v2_questions_set ON study_v2_questions(user_id,set_id,created_at,id);
    CREATE TABLE study_v2_question_jobs (
      id TEXT PRIMARY KEY, set_id TEXT NOT NULL, document_id TEXT NOT NULL, user_id TEXT NOT NULL,
      request_id TEXT NOT NULL, request_hash TEXT NOT NULL,
      target_question_id TEXT, target_version INTEGER,
      state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','succeeded','failed','interrupted')),
      lease_until INTEGER, lease_token TEXT, result_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(result_json)),
      error_code TEXT, error_message TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(user_id,request_id),
      FOREIGN KEY(set_id,document_id,user_id) REFERENCES study_v2_question_sets(id,document_id,user_id) ON DELETE CASCADE
    );
    CREATE INDEX study_v2_question_jobs_queue ON study_v2_question_jobs(state,created_at);
    CREATE TABLE study_v2_training_attempts (
      id TEXT PRIMARY KEY, set_id TEXT NOT NULL, document_id TEXT NOT NULL, user_id TEXT NOT NULL,
      request_id TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('immediate','deferred')),
      snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
      answers_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(answers_json)),
      finished_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(user_id,request_id),
      FOREIGN KEY(set_id,document_id,user_id) REFERENCES study_v2_question_sets(id,document_id,user_id) ON DELETE CASCADE
    );
    CREATE INDEX study_v2_training_history ON study_v2_training_attempts(user_id,document_id,created_at);
    CREATE TRIGGER study_v2_question_scope_immutable BEFORE UPDATE OF document_id,user_id,source_version,scope_json,settings_json ON study_v2_question_sets
      BEGIN SELECT RAISE(ABORT,'Study question source is immutable'); END;
    CREATE TRIGGER study_v2_training_snapshot_immutable BEFORE UPDATE OF snapshot_json,document_id,user_id,set_id,mode,request_id ON study_v2_training_attempts
      BEGIN SELECT RAISE(ABORT,'Study training snapshot is immutable'); END;
  `)
  db.prepare('INSERT INTO study_v2_migrations VALUES(3,?)').run(now)
}

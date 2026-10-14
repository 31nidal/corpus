export function migrateStudyAssistant(db, now) {
  if(db.prepare('SELECT 1 FROM study_v2_migrations WHERE version=4').get())return
  db.exec(`
    CREATE TABLE study_v2_assistant_threads (
      id TEXT PRIMARY KEY, document_id TEXT NOT NULL, user_id TEXT NOT NULL,
      request_id TEXT NOT NULL, title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 150),
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(user_id,request_id), UNIQUE(id,document_id,user_id),
      FOREIGN KEY(document_id,user_id) REFERENCES study_documents(id,user_id) ON DELETE CASCADE
    );
    CREATE INDEX study_v2_assistant_threads_owner ON study_v2_assistant_threads(user_id,document_id,created_at);
    CREATE TABLE study_v2_assistant_messages (
      id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, document_id TEXT NOT NULL, user_id TEXT NOT NULL,
      request_id TEXT NOT NULL, request_hash TEXT NOT NULL,
      prompt TEXT NOT NULL CHECK(length(trim(prompt)) BETWEEN 3 AND 2000),
      source_version INTEGER NOT NULL CHECK(source_version>=1),
      scope_json TEXT NOT NULL CHECK(json_valid(scope_json)),
      source_info_json TEXT NOT NULL CHECK(json_valid(source_info_json)),
      state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','succeeded','failed','interrupted')),
      response_json TEXT CHECK(response_json IS NULL OR json_valid(response_json)),
      generation_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(generation_json)),
      lease_until INTEGER, lease_token TEXT, error_code TEXT, error_message TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(user_id,request_id),
      FOREIGN KEY(thread_id,document_id,user_id) REFERENCES study_v2_assistant_threads(id,document_id,user_id) ON DELETE CASCADE
    );
    CREATE INDEX study_v2_assistant_messages_thread ON study_v2_assistant_messages(user_id,thread_id,created_at);
    CREATE INDEX study_v2_assistant_queue ON study_v2_assistant_messages(state,created_at);
    CREATE TRIGGER study_v2_assistant_source_immutable BEFORE UPDATE OF user_id,document_id,thread_id,request_id,request_hash,prompt,source_version,scope_json,source_info_json ON study_v2_assistant_messages
      BEGIN SELECT RAISE(ABORT,'Study assistant source is immutable'); END;
  `)
  db.prepare('INSERT INTO study_v2_migrations VALUES(4,?)').run(now)
}

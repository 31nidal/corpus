/** Called inside migrateStudyV2's transaction; legacy supports are never replaced. */
export function migrateStudyNotes(db, now) {
  if (db.prepare('SELECT 1 FROM study_v2_migrations WHERE version=2').get()) return
  db.exec(`CREATE TABLE study_v2_notes (
    id TEXT PRIMARY KEY, document_id TEXT NOT NULL, user_id TEXT NOT NULL,
    request_id TEXT NOT NULL, request_hash TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('short','structured','detailed')),
    title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 150),
    state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','saved','archived')),
    generation_state TEXT NOT NULL DEFAULT 'queued' CHECK(generation_state IN ('queued','running','succeeded','failed','interrupted')),
    origin TEXT NOT NULL DEFAULT 'generated' CHECK(origin IN ('generated','legacy')),
    source_version INTEGER NOT NULL CHECK(source_version>=1),
    scope_json TEXT NOT NULL CHECK(json_valid(scope_json)),
    content_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(content_json)),
    generation_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(generation_json)),
    edit_version INTEGER NOT NULL DEFAULT 1 CHECK(edit_version>=1),
    lease_until INTEGER, lease_token TEXT, error_code TEXT, error_message TEXT,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
    UNIQUE(user_id,request_id),
    FOREIGN KEY(document_id,user_id) REFERENCES study_documents(id,user_id) ON DELETE CASCADE
  );
  CREATE INDEX study_v2_notes_document ON study_v2_notes(user_id,document_id,created_at);
  CREATE INDEX study_v2_notes_queue ON study_v2_notes(generation_state,created_at);
  CREATE TRIGGER study_v2_notes_source_immutable BEFORE UPDATE OF document_id,user_id,source_version,scope_json,request_hash,request_id ON study_v2_notes
  BEGIN SELECT RAISE(ABORT,'Study note source is immutable'); END;`)
  db.prepare('INSERT INTO study_v2_migrations VALUES(2,?)').run(now)
}

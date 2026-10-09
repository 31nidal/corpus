import {FLASHCARD_NOTE_TYPES} from '../noteTypes.mjs'

// accepted + NULL note remains accepted after deletion, but may be re-accepted
// transactionally to create a replacement note. Timestamps are Unix milliseconds.
// Durable human review; never stores FSRS state or changes existing cards.
export function initDraftReviewSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS flashcard_drafts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES study_documents(id) ON DELETE CASCADE,
      section_id TEXT REFERENCES study_sections(id) ON DELETE SET NULL,
      page INTEGER NOT NULL CHECK(page>=1),
      note_type TEXT NOT NULL CHECK(note_type IN (${FLASHCARD_NOTE_TYPES.map(type => `'${type}'`).join(',')})),
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      fields_json TEXT NOT NULL,
      source_excerpt TEXT NOT NULL,
      content_hash TEXT NOT NULL CHECK(length(content_hash)=64 AND content_hash NOT GLOB '*[^0-9a-f]*'),
      subject TEXT NOT NULL DEFAULT '',
      chapter TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      confidence REAL NOT NULL DEFAULT 0 CHECK(confidence>=0 AND confidence<=1),
      verbatim_proof INTEGER NOT NULL DEFAULT 0 CHECK(verbatim_proof IN (0,1)),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','edited')),
      rejected_from TEXT CHECK(rejected_from IS NULL OR rejected_from IN ('pending','edited')),
      rejected_at INTEGER CHECK(rejected_at IS NULL OR (typeof(rejected_at)='integer' AND rejected_at>=created_at)),
      accepted_note_id TEXT UNIQUE REFERENCES flashcard_notes(id) ON DELETE SET NULL,
      created_at INTEGER NOT NULL CHECK(typeof(created_at)='integer' AND created_at>=0),
      updated_at INTEGER NOT NULL CHECK(typeof(updated_at)='integer' AND updated_at>=created_at)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS flashcard_drafts_content ON flashcard_drafts(user_id,document_id,content_hash);
    CREATE INDEX IF NOT EXISTS flashcard_drafts_document ON flashcard_drafts(user_id,document_id,status,created_at);
    CREATE INDEX IF NOT EXISTS flashcard_drafts_rejected ON flashcard_drafts(rejected_at) WHERE status='rejected';
  `)
}

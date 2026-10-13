/** Additive Study migrations. No existing document, card or review is rewritten. */
export function migrateStudyV2(db, now = Date.now()) {
    db.exec('BEGIN IMMEDIATE');
    try {
        db.exec(`CREATE TABLE IF NOT EXISTS study_v2_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS study_documents_id_owner ON study_documents(id,user_id);`);
        if (!db.prepare('SELECT 1 FROM study_v2_migrations WHERE version=1').get()) {
            db.exec(`
        CREATE TABLE study_v2_folders (
          id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          parent_id TEXT REFERENCES study_v2_folders(id) ON DELETE CASCADE,
          kind TEXT NOT NULL CHECK(kind IN ('subject','chapter')),
          name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
          created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
          CHECK((kind='subject' AND parent_id IS NULL) OR (kind='chapter' AND parent_id IS NOT NULL))
        );
        CREATE INDEX study_v2_folders_owner ON study_v2_folders(user_id,parent_id);
        CREATE TRIGGER study_v2_folder_parent_insert BEFORE INSERT ON study_v2_folders
        WHEN NEW.parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM study_v2_folders WHERE id=NEW.parent_id AND user_id=NEW.user_id AND kind='subject')
        BEGIN SELECT RAISE(ABORT,'Study folder parent owner mismatch'); END;
        CREATE TRIGGER study_v2_folder_parent_update BEFORE UPDATE OF parent_id,user_id ON study_v2_folders
        WHEN NEW.parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM study_v2_folders WHERE id=NEW.parent_id AND user_id=NEW.user_id AND kind='subject')
        BEGIN SELECT RAISE(ABORT,'Study folder parent owner mismatch'); END;
        CREATE TABLE study_v2_document_meta (
          document_id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
          folder_id TEXT REFERENCES study_v2_folders(id) ON DELETE SET NULL,
          archived_at INTEGER, last_opened_at INTEGER,
          reading_page INTEGER NOT NULL DEFAULT 1 CHECK(reading_page>=1),
          processing_state TEXT NOT NULL DEFAULT 'imported' CHECK(processing_state IN ('imported','processing','ready','partial','needs_attention','failed')),
          current_version INTEGER NOT NULL DEFAULT 1 CHECK(current_version>=1),
          file_hash TEXT CHECK(file_hash IS NULL OR (length(file_hash)=64 AND file_hash NOT GLOB '*[^0-9a-f]*')),
          created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
          FOREIGN KEY(document_id,user_id) REFERENCES study_documents(id,user_id) ON DELETE CASCADE
        );
        CREATE INDEX study_v2_meta_owner ON study_v2_document_meta(user_id,archived_at,last_opened_at);
        CREATE TRIGGER study_v2_meta_folder_insert BEFORE INSERT ON study_v2_document_meta
        WHEN NEW.folder_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM study_v2_folders WHERE id=NEW.folder_id AND user_id=NEW.user_id)
        BEGIN SELECT RAISE(ABORT,'Study document folder owner mismatch'); END;
        CREATE TRIGGER study_v2_meta_folder_update BEFORE UPDATE OF folder_id,user_id ON study_v2_document_meta
        WHEN NEW.folder_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM study_v2_folders WHERE id=NEW.folder_id AND user_id=NEW.user_id)
        BEGIN SELECT RAISE(ABORT,'Study document folder owner mismatch'); END;
        CREATE TABLE study_v2_jobs (
          id TEXT PRIMARY KEY, document_id TEXT NOT NULL, user_id TEXT NOT NULL,
          request_id TEXT NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('extract','ocr')),
          state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','succeeded','failed','needs_attention','interrupted')),
          stage TEXT NOT NULL DEFAULT 'stored', consent_ocr INTEGER NOT NULL DEFAULT 0 CHECK(consent_ocr IN (0,1)),
          attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0), lease_until INTEGER, lease_token TEXT,
          error_code TEXT, error_message TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
          UNIQUE(user_id,request_id),
          FOREIGN KEY(document_id,user_id) REFERENCES study_documents(id,user_id) ON DELETE CASCADE
        );
        CREATE INDEX study_v2_jobs_queue ON study_v2_jobs(state,created_at);
        CREATE TABLE study_v2_versions (
          id TEXT PRIMARY KEY, document_id TEXT NOT NULL, user_id TEXT NOT NULL,
          version INTEGER NOT NULL CHECK(version>=1),
          sections_json TEXT NOT NULL CHECK(json_valid(sections_json)),
          extraction_json TEXT NOT NULL CHECK(json_valid(extraction_json)), created_at INTEGER NOT NULL,
          UNIQUE(document_id,version), UNIQUE(id,document_id,user_id),
          FOREIGN KEY(document_id,user_id) REFERENCES study_documents(id,user_id) ON DELETE CASCADE
        );
        CREATE TABLE study_v2_blocks (
          id TEXT PRIMARY KEY, document_id TEXT NOT NULL, user_id TEXT NOT NULL, version_id TEXT NOT NULL,
          page INTEGER NOT NULL CHECK(page>=1), block_order INTEGER NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('heading','paragraph','table','list','code','figure')),
          text TEXT NOT NULL, bounds_json TEXT CHECK(bounds_json IS NULL OR json_valid(bounds_json)),
          FOREIGN KEY(version_id,document_id,user_id) REFERENCES study_v2_versions(id,document_id,user_id) ON DELETE CASCADE
        );
        CREATE INDEX study_v2_blocks_document ON study_v2_blocks(user_id,document_id,version_id,page,block_order);
        CREATE TRIGGER study_v2_version_immutable BEFORE UPDATE ON study_v2_versions
        BEGIN SELECT RAISE(ABORT,'Study source version is immutable'); END;
        CREATE TRIGGER study_v2_block_immutable BEFORE UPDATE ON study_v2_blocks
        BEGIN SELECT RAISE(ABORT,'Study source block is immutable'); END;
      `);
            db.prepare('INSERT INTO study_v2_migrations VALUES(1,?)').run(now);
        }
        // Projection only: the canonical legacy rows and identifiers remain intact.
        db.prepare(`INSERT OR IGNORE INTO study_v2_document_meta(document_id,user_id,processing_state,created_at,updated_at)
      SELECT id,user_id,CASE status WHEN 'ready' THEN 'ready' WHEN 'processing' THEN 'imported' ELSE 'failed' END,?,?
      FROM study_documents WHERE user_id IS NOT NULL`).run(now, now);
        db.exec('COMMIT');
    }
    catch (error) {
        db.exec('ROLLBACK');
        throw error;
    }
}

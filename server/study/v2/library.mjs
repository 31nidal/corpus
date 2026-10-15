import { randomUUID } from 'node:crypto';
export const studyError = (status, message, code) => Object.assign(new Error(message), { status, code });
export const MAX_LIBRARY_PAGE_SIZE = 100;
const escapeLike = value => value.replace(/[\\%_]/g, '\\$&');
const select = `SELECT d.id,d.title,d.filename,d.file_size AS fileSize,d.page_count AS pageCount,
  d.created_at AS createdAt,d.updated_at AS updatedAt,m.folder_id AS folderId,m.archived_at AS archivedAt,
  m.last_opened_at AS lastOpenedAt,COALESCE(m.reading_page,1) AS readingPage,
  CASE WHEN m.processing_state='imported'
    AND NOT EXISTS(SELECT 1 FROM study_v2_jobs j WHERE j.document_id=d.id AND j.user_id=d.user_id)
    THEN CASE d.status WHEN 'ready' THEN 'ready' WHEN 'processing' THEN 'needs_attention' ELSE 'failed' END
    ELSE COALESCE(m.processing_state,CASE d.status WHEN 'ready' THEN 'ready' WHEN 'processing' THEN 'imported' ELSE 'failed' END) END AS processingState,
  COALESCE(m.current_version,1) AS version,m.updated_at AS metadataUpdatedAt,CASE WHEN m.processing_state='imported' AND d.status='processing'
    AND NOT EXISTS(SELECT 1 FROM study_v2_jobs j WHERE j.document_id=d.id AND j.user_id=d.user_id)
    THEN COALESCE(d.error_message,'Cet import ancien ne possède aucun traitement actif. Reprenez le traitement depuis le PDF original.')
    ELSE d.error_message END AS errorMessage,
  (SELECT COUNT(*) FROM study_sections s WHERE s.document_id=d.id AND s.user_id=d.user_id) AS sectionCount
  FROM study_documents d LEFT JOIN study_v2_document_meta m ON m.document_id=d.id AND m.user_id=d.user_id`;
export class StudyLibrary {
    constructor(db, now = Date.now) { this.db = db; this.now = now; }
    document(userId, id) {
        const doc = this.db.prepare(select + ' WHERE d.id=? AND d.user_id=?').get(id, userId);
        if (!doc)
            throw studyError(404, 'Document introuvable.');
        return doc;
    }
    ensureMeta(userId, id) {
        const doc = this.document(userId, id), now = this.now();
        this.db.prepare(`INSERT OR IGNORE INTO study_v2_document_meta(document_id,user_id,processing_state,created_at,updated_at) VALUES(?,?,?,?,?)`).run(id, userId, doc.processingState, now, now);
        return this.document(userId, id);
    }
    list(userId, { q = '', folderId, archived = false, limit = 50, offset = 0 } = {}) {
        if (typeof q !== 'string' || q.length > 200 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIBRARY_PAGE_SIZE || !Number.isSafeInteger(offset) || offset < 0)
            throw studyError(400, 'Recherche ou pagination invalide.');
        if (folderId !== undefined && folderId !== null && !this.db.prepare('SELECT 1 FROM study_v2_folders WHERE id=? AND user_id=?').get(folderId, userId))
            throw studyError(404, 'Dossier introuvable.');
        const where = ['d.user_id=?', archived ? 'm.archived_at IS NOT NULL' : 'm.archived_at IS NULL'], params = [userId];
        if (folderId === null)
            where.push('m.folder_id IS NULL');
        else if (folderId !== undefined) {
            where.push('(m.folder_id=? OR m.folder_id IN (SELECT id FROM study_v2_folders WHERE parent_id=? AND user_id=?))');
            params.push(folderId, folderId, userId);
        }
        if (q.trim()) {
            where.push(`(d.title LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM study_sections s WHERE s.document_id=d.id AND s.user_id=d.user_id AND s.content LIKE ? ESCAPE '\\'))`);
            params.push('%' + escapeLike(q.trim()) + '%', '%' + escapeLike(q.trim()) + '%');
        }
        const docs = this.db.prepare(select + ' WHERE ' + where.join(' AND ') + ' ORDER BY COALESCE(m.last_opened_at,0) DESC,d.created_at DESC,d.id LIMIT ? OFFSET ?').all(...params, limit + 1, offset);
        return { documents: docs.slice(0, limit), nextOffset: docs.length > limit ? offset + limit : null, folders: this.db.prepare('SELECT id,parent_id AS parentId,kind,name FROM study_v2_folders WHERE user_id=? ORDER BY name,id').all(userId) };
    }
    createFolder(userId, { name, kind = 'subject', parentId = null } = {}) {
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || !['subject', 'chapter'].includes(kind) || (kind === 'subject' && parentId !== null) || (kind === 'chapter' && (typeof parentId !== 'string' || !parentId.trim())))
            throw studyError(400, 'Dossier invalide.');
        if (parentId && !this.db.prepare("SELECT 1 FROM study_v2_folders WHERE id=? AND user_id=? AND kind='subject'").get(parentId, userId))
            throw studyError(404, 'Matière introuvable.');
        const id = randomUUID(), now = this.now();
        this.db.prepare('INSERT INTO study_v2_folders VALUES(?,?,?,?,?,?,?)').run(id, userId, parentId, kind, name.trim(), now, now);
        return { id, name: name.trim(), kind, parentId };
    }
    patch(userId, id, patch) {
        let doc = this.document(userId, id);
        if (!patch || typeof patch !== 'object' || Array.isArray(patch) || !Object.keys(patch).length || Object.keys(patch).some(k => !['title', 'folderId', 'archived', 'readingPage', 'opened', 'expectedUpdatedAt'].includes(k)))
            throw studyError(400, 'Modification du document invalide.');
        if (patch.expectedUpdatedAt !== undefined && patch.expectedUpdatedAt !== doc.metadataUpdatedAt)
            throw studyError(409, 'Le document a changé. Rechargez avant de modifier.');
        if (patch.title !== undefined && (typeof patch.title !== 'string' || !patch.title.trim() || patch.title.trim().length > 150))
            throw studyError(400, 'Titre invalide.');
        if (patch.folderId !== undefined && patch.folderId !== null && (typeof patch.folderId !== 'string' || !this.db.prepare('SELECT 1 FROM study_v2_folders WHERE id=? AND user_id=?').get(patch.folderId, userId)))
            throw studyError(404, 'Dossier introuvable.');
        if (patch.archived !== undefined && typeof patch.archived !== 'boolean' || patch.opened !== undefined && typeof patch.opened !== 'boolean')
            throw studyError(400, 'État du document invalide.');
        if (patch.readingPage !== undefined && (!Number.isSafeInteger(patch.readingPage) || patch.readingPage < 1 || patch.readingPage > Math.max(1, doc.pageCount)))
            throw studyError(400, 'Page de lecture invalide.');
        this.db.exec('BEGIN IMMEDIATE');
        try {
            // Compare the projected legacy snapshot before creating its metadata,
            // while holding the SQLite write lock. Null is a real initial version.
            doc = this.document(userId, id);
            if (patch.expectedUpdatedAt !== undefined && patch.expectedUpdatedAt !== doc.metadataUpdatedAt)
                throw studyError(409, 'Le document a changé. Rechargez avant de modifier.');
            doc = this.ensureMeta(userId, id);
            const now = Math.max(this.now(), doc.metadataUpdatedAt + 1);
            if (patch.title !== undefined)
                this.db.prepare('UPDATE study_documents SET title=?,updated_at=? WHERE id=? AND user_id=?').run(patch.title.trim(), new Date(now).toISOString(), id, userId);
            this.db.prepare(`UPDATE study_v2_document_meta SET folder_id=?,archived_at=?,reading_page=?,last_opened_at=?,updated_at=? WHERE document_id=? AND user_id=?`).run(patch.folderId === undefined ? doc.folderId : patch.folderId, patch.archived === undefined ? doc.archivedAt : patch.archived ? doc.archivedAt ?? now : null, patch.readingPage ?? doc.readingPage, patch.opened ? now : doc.lastOpenedAt, now, id, userId);
            this.db.exec('COMMIT');
        }
        catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
        return this.document(userId, id);
    }
}

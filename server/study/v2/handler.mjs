import {StudyNotes} from './notes.mjs';
import { migrateStudyV2 } from './schema.mjs';
import { StudyLibrary, studyError } from './library.mjs';
import { DocumentPipeline, MAX_DOCUMENT_BYTES } from './pipeline.mjs';
export async function readStudyV2Json(req) {
    let size = 0, parts = [];
    for await (const part of req) {
        size += Buffer.byteLength(part);
        if (size > 1000000)
            throw studyError(413, 'Requête trop volumineuse.');
        parts.push(Buffer.from(part));
    }
    let value;
    try {
        value = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
    }
    catch {
        throw studyError(400, 'Requête JSON invalide.');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw studyError(400, 'Objet JSON attendu.');
    return value;
}
const keys = (body, allowed) => { if (Object.keys(body).some(key => !allowed.includes(key)))
    throw studyError(400, 'Paramètre inconnu.'); };
export function createStudyV2Service({ db, config, provider, getStorageDir, localSummary, ...dependencies }) {
    migrateStudyV2(db);
    const library = new StudyLibrary(db), pipeline = new DocumentPipeline({ db, config, provider, getStorageDir, localSummary, ...dependencies });
    const notes = new StudyNotes({db, config, provider, localSummary});
    return { pipeline, notes, async handle({ req, url, userId, send }) {
            const path = url.pathname.replace('/api/study/v2/', '').replace(/\/$/, '');
            if (req.method === 'GET' && path === 'documents') {
                const q = url.searchParams.get('q') || '', folderId = url.searchParams.has('folderId') ? url.searchParams.get('folderId') || null : undefined;
                const archived = url.searchParams.get('archived') || 'false';
                if (!['true', 'false'].includes(archived))
                    throw studyError(400, 'Filtre archive invalide.');
                return send(200, library.list(userId, { q, folderId, archived: archived === 'true', limit: Number(url.searchParams.get('limit') ?? 50), offset: Number(url.searchParams.get('offset') ?? 0) }));
            }
            if (req.method === 'POST' && path === 'folders') {
                const body = await readStudyV2Json(req);
                keys(body, ['name', 'kind', 'parentId']);
                return send(201, { folder: library.createFolder(userId, body) });
            }
            if (req.method === 'POST' && path === 'documents/upload') {
                if (!String(req.headers['content-type'] || '').startsWith('application/pdf'))
                    throw studyError(415, 'Envoyez le PDF original.');
                let size = 0, parts = [];
                for await (const part of req) {
                    size += part.length;
                    if (size > MAX_DOCUMENT_BYTES)
                        throw studyError(413, 'Le PDF dépasse 25 Mo.');
                    parts.push(Buffer.from(part));
                }
                let filename, title;
                try {
                    filename = decodeURIComponent(req.headers['x-document-filename'] || 'cours.pdf');
                    title = decodeURIComponent(req.headers['x-document-title'] || filename.replace(/\.pdf$/i, ''));
                }
                catch {
                    throw studyError(400, 'Nom du document invalide.');
                }
                if (req.headers['x-document-ocr'] !== undefined && !['0', '1'].includes(req.headers['x-document-ocr']))
                    throw studyError(400, 'Consentement OCR invalide.');
                return send(202, pipeline.upload(userId, Buffer.concat(parts), { requestId: req.headers['x-study-request-id'], filename, title, consentOcr: req.headers['x-document-ocr'] === '1' }));
            }
        const noteMatch = path.match(/^documents\/([a-zA-Z0-9_-]+)\/notes(?:\/([a-zA-Z0-9_-]+))?$/);
        if (noteMatch) {
          const [,documentId,noteId] = noteMatch;
          library.document(userId, documentId);
          if (noteId) notes.get(userId, documentId, noteId);
          if (req.method==='GET') return send(200, noteId ? {note:notes.get(userId,documentId,noteId)} : {notes:notes.list(userId,documentId).map(({items,...note})=>({...note,itemCount:items.length}))});
          if (req.method==='POST'&&!noteId) return send(202,notes.create(userId,documentId,await readStudyV2Json(req)));
          if (req.method==='PATCH'&&noteId) return send(200,{note:notes.patch(userId,documentId,noteId,await readStudyV2Json(req))});
          if (req.method==='DELETE'&&noteId) {notes.delete(userId,documentId,noteId);return send(200,{deleted:true})}
          return send(405,{error:'Méthode non autorisée.'});
        }
            const document = path.match(/^documents\/([a-zA-Z0-9_-]+)(?:\/(job|retry|sources))?$/);
            if (document) {
                const [, id, action] = document;
                library.document(userId, id); // Every action, including wrong methods, is owner scoped.
                if (req.method === 'GET' && !action)
                    return send(200, { document: library.document(userId, id), job: pipeline.latest(userId, id) });
                if (req.method === 'PATCH' && !action)
                    return send(200, { document: library.patch(userId, id, await readStudyV2Json(req)) });
                if (req.method === 'GET' && action === 'job')
                    return send(200, { job: pipeline.latest(userId, id) });
                if (req.method === 'POST' && action === 'retry') {
                    const body = await readStudyV2Json(req);
                    keys(body, ['requestId', 'consentOcr']);
                    return send(202, pipeline.retry(userId, id, body));
                }
                if (req.method === 'GET' && action === 'sources') {
                    const doc = library.document(userId, id), version = db.prepare('SELECT id FROM study_v2_versions WHERE document_id=? AND user_id=? AND version=?').get(id, userId, doc.version);
                    const page = Number(url.searchParams.get('page') || doc.readingPage);
                    if (!Number.isSafeInteger(page) || page < 1 || page > Math.max(1, doc.pageCount))
                        throw studyError(400, 'Page invalide.');
                    return send(200, { version: doc.version, page, blocks: version ? db.prepare('SELECT id,page,kind,text,bounds_json AS bounds FROM study_v2_blocks WHERE document_id=? AND user_id=? AND version_id=? AND page=? ORDER BY block_order').all(id, userId, version.id, page).map(block => ({ ...block, bounds: JSON.parse(block.bounds || 'null') })) : [] });
                }
                return send(405, { error: 'Méthode non autorisée.' });
            }
            const job = path.match(/^jobs\/([a-zA-Z0-9_-]+)$/);
            if (job) {
                if (req.method === 'GET')
                    return send(200, { job: pipeline.job(userId, job[1]) });
                return send(405, { error: 'Méthode non autorisée.' });
            }
            return send(404, { error: 'Route Study 2.0 inconnue.' });
        } };
}

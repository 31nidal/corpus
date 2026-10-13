import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { initStudySchema, createStudyHandler } from '../server/study.mjs';
import { migrateStudyV2 } from '../server/study/v2/schema.mjs';
import { DocumentPipeline, DOCUMENT_LEASE_MS, MAX_DOCUMENT_BYTES, MAX_QUEUED_DOCUMENT_JOBS, MAX_DOCUMENT_RESTART_ATTEMPTS } from '../server/study/v2/pipeline.mjs';
import { StudyLibrary } from '../server/study/v2/library.mjs';
const pdf = Buffer.from('%PDF-1.4\noriginal fixture bytes\n%%EOF');
const sentence = 'Le rein filtre le plasma sanguin et assure la filtration glomérulaire.';
const extracted = { pageCount: 2, pages: [{ pageNumber: 1, text: sentence, headings: [] }, { pageNumber: 2, text: 'La fonction rénale dépend du débit sanguin et de la pression de filtration.', headings: [] }], extraction: { method: 'pdfjs', warnings: [] } };
function fixture(options = {}) {
    const db = new DatabaseSync(':memory:'), dir = mkdtempSync(path.join(tmpdir(), 'study-v2-'));
    db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u'),('other');");
    initStudySchema(db);
    migrateStudyV2(db);
    const getStorageDir = user => { const folder = path.join(dir, 'uploads', user); mkdirSync(folder, { recursive: true }); return folder; };
    const pipeline = new DocumentPipeline({ db, getStorageDir, extract: async () => structuredClone(extracted), ...options });
    return { db, dir, getStorageDir, pipeline, library: new StudyLibrary(db), async close() { await pipeline.close(); db.close(); rmSync(dir, { recursive: true, force: true }); } };
}
const upload = (pipeline, requestId = 'request', consentOcr = false) => pipeline.upload('u', pdf, { requestId, filename: 'cours.pdf', title: 'Anatomie', consentOcr });
test('Pipeline V2 : original conservé avant extraction, demande idempotente, pages/sources indexées', async () => {
    let release;
    const api = fixture({ extract: () => new Promise(resolve => { release = resolve; }) });
    try {
        const imported = upload(api.pipeline);
        assert.equal(imported.document.processingState, 'imported');
        assert.deepEqual(readFileSync(api.pipeline.file('u', imported.document.id)), pdf);
        assert.equal(upload(api.pipeline).document.id, imported.document.id);
        assert.throws(() => api.pipeline.upload('u', Buffer.from('%PDF-another'), { requestId: 'request', filename: 'cours.pdf', title: 'Cours' }), error => error.status === 409);
        await new Promise(resolve => setImmediate(resolve));
        release(structuredClone(extracted));
        await api.pipeline.drain();
        assert.equal(api.library.document('u', imported.document.id).processingState, 'ready');
        assert.equal(api.db.prepare('SELECT COUNT(*) AS n FROM study_v2_versions').get().n, 1);
        assert.equal(api.db.prepare('SELECT COUNT(*) AS n FROM study_v2_blocks').get().n, 2);
        assert.throws(()=>api.db.prepare("UPDATE study_v2_blocks SET text='source modifiée'").run(),/immutable/);
        assert.throws(()=>api.db.prepare("UPDATE study_v2_versions SET sections_json='[]'").run(),/immutable/);
        assert.equal(api.db.prepare('SELECT text FROM study_pdf_pages WHERE page_number=1').get().text, sentence);
        assert.deepEqual(api.db.prepare('PRAGMA foreign_key_check').all(), []);
    }
    finally {
        await api.close();
    }
});
test('Pipeline V2 : scan sans consentement conservé, sans appel OCR implicite', async () => {
    let calls = 0;
    const api = fixture({ extract: async () => { throw Object.assign(new Error('PDF scanné sans texte.'), { code: 'ERR_NO_EXTRACTABLE_TEXT', pageCount: 2 }); }, provider: { name: 'gemini', extractScannedPdf: async () => { calls++; return extracted; } } });
    try {
        const imported = upload(api.pipeline);
        await api.pipeline.drain();
        assert.equal(calls, 0);
        assert.equal(api.library.document('u', imported.document.id).processingState, 'needs_attention');
        assert.equal(api.pipeline.job('u', imported.job.id).errorCode, 'ERR_NO_EXTRACTABLE_TEXT');
        assert.ok(existsSync(api.pipeline.file('u', imported.document.id)));
    }
    finally {
        await api.close();
    }
});
test('Pipeline V2 : OCR explicitement consenti, quotas existants et état incertain signalé', async () => {
    let calls = 0;
    const provider = { name: 'gemini', async extractScannedPdf() {
            calls++;
            return { ...extracted, pages: extracted.pages.map(page => ({ ...page, uncertain: page.pageNumber === 2 })),
                generation: { mode: 'gemini', model: 'fake', usage: { attempts: 1, inputTokens: 100, outputTokens: 100, estimatedUsd: 0, usageKnown: true } } };
        } };
    const api = fixture({ extract: async () => { throw Object.assign(new Error('scan'), { code: 'ERR_NO_EXTRACTABLE_TEXT', pageCount: 2 }); }, provider });
    try {
        const imported = upload(api.pipeline, 'ocr-request', true);
        await api.pipeline.drain();
        assert.equal(calls, 1);
        assert.equal(api.library.document('u', imported.document.id).processingState, 'partial');
        assert.equal(api.db.prepare("SELECT generations_used FROM study_quotas WHERE user_id='u'").get().generations_used, 1);
        assert.ok(api.db.prepare('SELECT metadata_json FROM study_pdf_extractions').get().metadata_json.includes('incertaine'));
    }
    finally {
        await api.close();
    }
});
test('Pipeline V2 : distinction filtre non supporté / flux corrompu sans perdre le PDF', async () => {
    for (const [code, state] of [['ERR_UNSUPPORTED_PDF_FILTER', 'needs_attention'], ['ERR_INVALID_PDF_STREAM', 'failed']]) {
        const api = fixture({ extract: async () => { throw Object.assign(new Error(code + ' : LZWDecode'), { code }); } });
        try {
            const imported = upload(api.pipeline);
            await api.pipeline.drain();
            assert.equal(api.library.document('u', imported.document.id).processingState, state);
            assert.equal(api.pipeline.job('u', imported.job.id).errorCode, code);
            assert.ok(existsSync(api.pipeline.file('u', imported.document.id)));
        }
        finally {
            await api.close();
        }
    }
});
test('Pipeline V2 : reprise native expirée ; OCR interrompu jamais relancé automatiquement', async () => {
    const api = fixture({ extract: async () => structuredClone(extracted) });
    try {
        const imported = upload(api.pipeline);
        api.db.prepare("UPDATE study_v2_jobs SET state='running',stage='extracting',lease_until=0,attempts=1 WHERE id=?").run(imported.job.id);
        api.pipeline.recover();
        await api.pipeline.drain();
        assert.equal(api.pipeline.job('u', imported.job.id).state, 'succeeded');
        api.db.prepare("UPDATE study_v2_jobs SET state='running',stage='ocr',lease_until=0 WHERE id=?").run(imported.job.id);
        api.pipeline.recover();
        assert.equal(api.pipeline.job('u', imported.job.id).state, 'interrupted');
        assert.equal(api.pipeline.job('u', imported.job.id).errorCode, 'OCR_INTERRUPTED');
        assert.ok(DOCUMENT_LEASE_MS >= 60000);
    }
    finally {
        await api.close();
    }
});
test('Pipeline V2 : récupération d’une page manquante sans modifier une source déjà citée', async () => {
    let pass = 0;
    const api = fixture({ extract: async () => ({ ...structuredClone(extracted), pages: extracted.pages.map(page => ({ ...page, text: page.pageNumber === 2 ? '' : pass ? 'Texte reformulé à ne pas substituer.' : page.text })), extraction: { method: 'pdfjs', warnings: ['Page 2 : aucun texte sélectionnable.'] } }), provider: { name: 'gemini', extractScannedPdf: async () => ({ ...extracted, pages: extracted.pages.map(page => ({ ...page, uncertain: false })), generation: { mode: 'gemini' } }) } });
    try {
        const imported = upload(api.pipeline);
        await api.pipeline.drain();
        const oldSection = api.db.prepare('SELECT id,content FROM study_sections LIMIT 1').get();
        pass++;
        api.pipeline.retry('u', imported.document.id, { requestId: 'recover', consentOcr: true });
        await api.pipeline.drain();
        assert.equal(api.db.prepare('SELECT text FROM study_pdf_pages WHERE page_number=1').get().text, sentence);
        assert.deepEqual(api.db.prepare('SELECT id,content FROM study_sections WHERE id=?').get(oldSection.id), oldSection);
        assert.equal(api.library.document('u', imported.document.id).version, 2);
        assert.equal(api.library.document('u', imported.document.id).processingState, 'ready');
        assert.equal(api.db.prepare('SELECT COUNT(*) AS n FROM study_v2_versions').get().n, 2);
    }
    finally {
        await api.close();
    }
});
test('Bibliothèque V2 : recherche dans le contenu, classement, archive/restauration, position et propriétaire', async () => {
    const api = fixture();
    try {
        const imported = upload(api.pipeline);
        await api.pipeline.drain();
        const subject = api.library.createFolder('u', { name: 'Anatomie' }), chapter = api.library.createFolder('u', { name: 'Rein', kind: 'chapter', parentId: subject.id });
        api.library.patch('u', imported.document.id, { title: 'Fonction rénale', folderId: chapter.id, readingPage: 2, opened: true });
        assert.equal(api.library.list('u', { q: 'glomérulaire', folderId: subject.id }).documents.length, 1);
        assert.equal(api.library.list('u', { q: '%', folderId: subject.id }).documents.length, 0);
        assert.equal(api.library.list('other', { q: 'glomérulaire' }).documents.length, 0);
        assert.throws(() => api.library.patch('other', imported.document.id, { title: 'Volé' }), error => error.status === 404);
        assert.throws(() => api.library.patch('u', imported.document.id, { readingPage: 3 }), error => error.status === 400);
        api.library.patch('u', imported.document.id, { archived: true });
        assert.equal(api.library.list('u').documents.length, 0);
        assert.equal(api.library.list('u', { archived: true }).documents.length, 1);
        api.library.patch('u', imported.document.id, { archived: false });
        assert.equal(api.library.document('u', imported.document.id).readingPage, 2);
        assert.ok(existsSync(api.pipeline.file('u', imported.document.id)));
    }
    finally {
        await api.close();
    }
});
test('Pipeline V2 : fichiers invalides, limites de taille et de file contrôlées avant stockage', async () => {
    const api = fixture();
    try {
        assert.throws(() => api.pipeline.upload('u', Buffer.from('pas un PDF'), { requestId: 'bad', filename: 'cours.pdf', title: 'Cours' }), error => error.status === 415);
        assert.throws(() => api.pipeline.upload('u', Buffer.alloc(MAX_DOCUMENT_BYTES + 1), { requestId: 'large', filename: 'cours.pdf', title: 'Cours' }), error => error.status === 413);
        for (let i = 0; i < MAX_QUEUED_DOCUMENT_JOBS; i++)
            upload(api.pipeline, 'queue-' + i);
        assert.throws(() => upload(api.pipeline, 'queue-overflow'), error => error.status === 429);
        await api.pipeline.drain();
        assert.equal(api.db.prepare('SELECT COUNT(*) AS n FROM study_documents').get().n, MAX_QUEUED_DOCUMENT_JOBS);
        assert.throws(() => api.library.createFolder('u', { name: 'Vide', kind: 'chapter', parentId: '' }), error => error.status === 400);
    }
    finally {
        await api.close();
    }
});
test('Pipeline V2 : un worker ayant perdu son bail ne peut remplacer les sources ni le résultat du successeur', async () => {
    let release;
    const api = fixture({ extract: () => new Promise(resolve => { release = resolve; }) });
    try {
        const imported = upload(api.pipeline);
        await new Promise(resolve => setImmediate(resolve));
        api.db.prepare("UPDATE study_v2_jobs SET lease_token='new-owner' WHERE id=?").run(imported.job.id);
        release(structuredClone(extracted));
        await api.pipeline.drain();
        assert.equal(api.db.prepare('SELECT COUNT(*) AS n FROM study_sections').get().n, 0);
        assert.equal(api.db.prepare('SELECT lease_token FROM study_v2_jobs').get().lease_token, 'new-owner');
        assert.equal(api.pipeline.job('u', imported.job.id).state, 'running');
    }
    finally {
        await api.close();
    }
});
test('Pipeline V2 : limite de reprises et OCR sans texte suffisant remboursé', async () => {
    const api = fixture({ extract: async () => { throw Object.assign(new Error('scan'), { code: 'ERR_NO_EXTRACTABLE_TEXT', pageCount: 1 }); }, provider: { name: 'gemini', extractScannedPdf: async () => ({ pageCount: 1, pages: [{ pageNumber: 1, text: 'Illisible', uncertain: true }], generation: { mode: 'gemini' } }) } });
    try {
        const imported = upload(api.pipeline, 'empty-ocr', true);
        await api.pipeline.drain();
        assert.equal(api.pipeline.job('u', imported.job.id).errorCode, 'ERR_NO_EXTRACTABLE_TEXT');
        assert.equal(api.db.prepare("SELECT generations_used FROM study_quotas WHERE user_id='u'").get().generations_used, 0);
        api.db.prepare("UPDATE study_v2_jobs SET state='running',stage='extracting',lease_until=0,attempts=? WHERE id=?").run(MAX_DOCUMENT_RESTART_ATTEMPTS, imported.job.id);
        api.pipeline.recover();
        assert.equal(api.pipeline.job('u', imported.job.id).errorCode, 'PDF_RESTART_LIMIT');
        assert.ok(existsSync(api.pipeline.file('u', imported.document.id)));
    }
    finally {
        await api.close();
    }
});

test('Pipeline V2 : serveur redémarré reprend les tâches sans attendre une visite de la bibliothèque',async()=>{
  const api=fixture()
  let restarted
  try {
    const imported=upload(api.pipeline)
    await api.pipeline.close() // The queued import has not started yet.
    restarted=createStudyHandler({ACCOUNT_DATA_DIR:api.dir},{db:api.db,v2:{extract:async()=>structuredClone(extracted)}})
    const service=restarted.resume()
    await service.pipeline.drain()
    assert.equal(service.pipeline.job('u',imported.job.id).state,'succeeded')
    assert.equal(api.library.document('u',imported.document.id).processingState,'ready')
  }finally{await restarted?.close();await api.close()}
})

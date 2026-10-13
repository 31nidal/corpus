import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createAccountHandler } from '../server/accounts.mjs';
import { createStudyHandler } from '../server/study.mjs';
import { extractInWorker } from '../server/study/v2/pipeline.mjs';
const text = 'Le rein filtre le plasma sanguin et assure la filtration glomérulaire.';
const content = { pageCount: 1, pages: [{ pageNumber: 1, text, headings: [] }], extraction: { method: 'fixture', warnings: [] } };
function fixture() {
    const dir = mkdtempSync(path.join(tmpdir(), 'study-v2-api-')), config = { ACCOUNT_DATA_DIR: dir };
    const accounts = createAccountHandler(config), study = createStudyHandler(config, { v2: { extract: async () => structuredClone(content) } });
    return { async call(route, { method = 'GET', body, cookie = '', headers = {} } = {}) {
            const buffer = body === undefined ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
            const req = Readable.from(buffer.length ? [buffer] : []);
            Object.assign(req, { url: route, method, socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:5173', cookie, 'x-mycorpus-request': '1', ...(body === undefined ? {} : { 'content-type': Buffer.isBuffer(body) ? 'application/pdf' : 'application/json' }), ...headers } });
            let status = 200, data, received = {};
            const res = { setHeader(name, value) { received[name.toLowerCase()] = value; }, writeHead(value, extra = {}) { status = value; for (const [key, value] of Object.entries(extra))
                    received[key.toLowerCase()] = value; }, end(value = '') { data = Buffer.from(value); } };
            await (route.startsWith('/api/account/') ? accounts : study)(req, res);
            const cookies = [received['set-cookie']].flat().filter(Boolean).map(value => value.split(';')[0]);
            return { status, data: received['content-type']?.startsWith('application/pdf') ? data : JSON.parse(data?.toString() || 'null'), headers: received, cookie: cookies.find(value => value.startsWith('mycorpus_session=')) };
        }, async close() { await study.close(); rmSync(dir, { recursive: true, force: true }); } };
}
async function register(api) { const result = await api.call('/api/account/register', { method: 'POST', body: { name: 'Study', email: `study-${crypto.randomUUID()}@example.test`, password: 'Study-v2-test-solide-2026' } }); assert.equal(result.status, 201); return result.cookie; }
async function imported(api, cookie) { const result = await api.call('/api/study/v2/documents/upload', { method: 'POST', cookie, body: Buffer.from('%PDF-1.4\nfixture\n%%EOF'), headers: { 'x-study-request-id': crypto.randomUUID(), 'x-document-filename': 'cours.pdf', 'x-document-title': 'Anatomie' } }); assert.equal(result.status, 202); return result.data; }
test('Study V2 API : bibliothèque, classement, recherche contenu, archive/restauration et ancien PDF', async () => {
    const api = fixture();
    try {
        const cookie = await register(api), up = await imported(api, cookie), id = up.document.id;
        const folder = await api.call('/api/study/v2/folders', { method: 'POST', cookie, body: { name: 'Anatomie' } });
        assert.equal(folder.status, 201);
        assert.equal((await api.call(`/api/study/v2/documents/${id}`, { method: 'PATCH', cookie, body: { folderId: folder.data.folder.id, title: 'Rein', opened: true } })).status, 200);
        const listing = await api.call('/api/study/v2/documents?q=glom%C3%A9rulaire', { cookie });
        assert.equal(listing.data.documents[0].title, 'Rein');
        const pdf = await api.call(`/api/study/documents/${id}/pdf`, { cookie });
        assert.equal(pdf.status, 200);
        assert.match(pdf.data.toString(), /^%PDF/);
        await api.call(`/api/study/v2/documents/${id}`, { method: 'PATCH', cookie, body: { archived: true } });
        assert.equal((await api.call('/api/study/v2/documents', { cookie })).data.documents.length, 0);
        assert.equal((await api.call('/api/study/v2/documents?archived=true', { cookie })).data.documents.length, 1);
        await api.call(`/api/study/v2/documents/${id}`, { method: 'PATCH', cookie, body: { archived: false } });
        assert.equal((await api.call('/api/study/v2/documents', { cookie })).data.documents.length, 1);
    }
    finally {
        await api.close();
    }
});
test('Study V2 API : 404 pour autrui sur document, pages sources, tâche et reprise ; origine et paramètres contrôlés', async () => {
    const api = fixture();
    try {
        const cookie = await register(api), other = await register(api), up = await imported(api, cookie), id = up.document.id;
        for (const [route, method, body] of [[`documents/${id}`, 'GET'], [`documents/${id}`, 'PATCH', { title: 'Vol' }], [`documents/${id}/job`, 'GET'], [`documents/${id}/sources`, 'GET'], [`documents/${id}/retry`, 'POST', { requestId: 'retry' }], [`jobs/${up.job.id}`, 'GET']])
            assert.equal((await api.call('/api/study/v2/' + route, { method, body, cookie: other })).status, 404, route);
        assert.equal((await api.call('/api/study/v2/documents', { cookie: other })).data.documents.length, 0);
        assert.equal((await api.call(`/api/study/v2/documents/${id}`, { method: 'PATCH', body: { title: 'Refus' }, cookie, headers: { origin: 'https://intrus.example' } })).status, 403);
        assert.equal((await api.call('/api/study/v2/documents?limit=101', { cookie })).status, 400);
        assert.equal((await api.call(`/api/study/v2/documents/${id}/sources?page=0`, { cookie })).status, 400);
        assert.equal((await api.call(`/api/study/v2/documents/${id}`, { method: 'PATCH', body: { readingPage: 2 }, cookie })).status, 400);
        assert.equal((await api.call('/api/study/v2/documents', { cookie: '' })).status, 401);
    }
    finally {
        await api.close();
    }
});
test('Study V2 : worker réel extrait un PDF texte et refuse une dimension excessive', async () => {
    const makePdf = size => Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${size} 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 130 >>\nstream\nBT /F1 12 Tf 72 712 Td (Le debit cardiaque est egal au produit de la frequence cardiaque par le volume systolique.) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`);
    const extracted = await extractInWorker(makePdf(612));
    assert.equal(extracted.pageCount, 1);
    assert.match(extracted.totalText, /volume systolique/);
    await assert.rejects(() => extractInWorker(makePdf(20000)), error => error.code === 'ERR_PDF_DIMENSIONS');
});

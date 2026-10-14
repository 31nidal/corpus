import test from 'node:test';
import assert from 'node:assert/strict';
import {extractInWorker} from '../server/study/v2/pipeline.mjs';
import {fixture,register,imported} from './helpers/study-v2-api.mjs';
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

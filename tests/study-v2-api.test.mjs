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

test('Study V2 : pagination réelle de 101 documents, sans fuite entre comptes',async()=>{
    const {DatabaseSync}=await import('node:sqlite')
    const {initStudySchema}=await import('../server/study.mjs')
    const {migrateStudyV2}=await import('../server/study/v2/schema.mjs')
    const {StudyLibrary}=await import('../server/study/v2/library.mjs')
    const db=new DatabaseSync(':memory:')
    try{
        db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u'),('other');")
        initStudySchema(db);migrateStudyV2(db)
        const insert=db.prepare('INSERT INTO study_documents(id,user_id,title,filename,file_size,page_count,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
        for(let index=0;index<101;index++)insert.run(`d${index}`,'u',`Cours ${index}`,'cours.pdf',100,1,'2026-10-14','2026-10-14')
        insert.run('other','other','Autre utilisateur','cours.pdf',100,1,'2026-10-14','2026-10-14')
        const library=new StudyLibrary(db),first=library.list('u',{limit:100}),second=library.list('u',{limit:100,offset:first.nextOffset})
        assert.equal(first.documents.length,100);assert.equal(second.documents.length,1);assert.equal(second.nextOffset,null)
        assert.equal(new Set([...first.documents,...second.documents].map(doc=>doc.id)).size,101)
        assert.equal(library.list('other',{limit:100}).documents.length,1)
    }finally{db.close()}
})

test('Study V2 : premier classement d’un import classique postérieur à la migration, CAS null et données préservées',async()=>{
    const {DatabaseSync}=await import('node:sqlite')
    const {initStudySchema}=await import('../server/study.mjs')
    const {migrateStudyV2}=await import('../server/study/v2/schema.mjs')
    const {StudyLibrary}=await import('../server/study/v2/library.mjs')
    const db=new DatabaseSync(':memory:')
    try{
        db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u'),('other');")
        initStudySchema(db);migrateStudyV2(db)
        db.prepare("INSERT INTO study_documents(id,user_id,title,filename,file_size,page_count,created_at,updated_at) VALUES('legacy','u','Classique','classique.pdf',100,2,'2026-10-14','2026-10-14')").run()
        const library=new StudyLibrary(db),snapshot=library.list('u').documents[0]
        assert.equal(snapshot.metadataUpdatedAt,null)
        const updated=library.patch('u','legacy',{title:'Cours renommé',expectedUpdatedAt:snapshot.metadataUpdatedAt})
        assert.equal(updated.title,'Cours renommé');assert.ok(updated.metadataUpdatedAt>0)
        assert.throws(()=>library.patch('u','legacy',{title:'Conflit',expectedUpdatedAt:null}),error=>error.status===409)
        assert.throws(()=>library.patch('other','legacy',{title:'Vol',expectedUpdatedAt:null}),error=>error.status===404)
        assert.equal(db.prepare("SELECT filename,page_count FROM study_documents WHERE id='legacy'").get().filename,'classique.pdf')
        assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
    }finally{db.close()}
})
test('Study V2 : un import classique fini après projection ne reste pas en attente d’un job V2 inexistant',async()=>{
    const {DatabaseSync}=await import('node:sqlite')
    const {initStudySchema}=await import('../server/study.mjs')
    const {migrateStudyV2}=await import('../server/study/v2/schema.mjs')
    const {StudyLibrary}=await import('../server/study/v2/library.mjs')
    const db=new DatabaseSync(':memory:')
    try{
        db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u');")
        initStudySchema(db)
        db.prepare("INSERT INTO study_documents(id,user_id,title,filename,file_size,page_count,status,created_at,updated_at) VALUES('legacy','u','Classique','classique.pdf',100,2,'processing','2026-10-14','2026-10-14')").run()
        migrateStudyV2(db)
        const library=new StudyLibrary(db)
        assert.equal(library.document('u','legacy').processingState,'needs_attention')
        assert.match(library.document('u','legacy').errorMessage,/aucun traitement actif/)
        db.prepare("UPDATE study_documents SET status='ready' WHERE id='legacy'").run()
        assert.equal(library.document('u','legacy').processingState,'ready')
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_v2_jobs').get().n,0)
        assert.equal(db.prepare("SELECT processing_state FROM study_v2_document_meta WHERE document_id='legacy'").get().processing_state,'imported','Projection à la lecture ; source existante non réécrite')
    }finally{db.close()}
})

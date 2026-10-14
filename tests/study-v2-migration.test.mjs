import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { initStudySchema } from '../server/study.mjs';
import { initFlashcardSchema } from '../server/flashcards/schema.mjs';
import { migrateFlashcards } from '../server/flashcards/migrations.mjs';
import { FlashcardRepository } from '../server/flashcards/repository.mjs';
import { migrateStudyV2 } from '../server/study/v2/schema.mjs';
function fixture() {
    const db = new DatabaseSync(':memory:');
    db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u'),('other');");
    initStudySchema(db);
    initFlashcardSchema(db);
    migrateFlashcards(db);
    for (const [id, user] of [['d', 'u'], ['other-d', 'other']])
        db.prepare(`INSERT INTO study_documents(id,user_id,title,filename,file_size,page_count,created_at,updated_at) VALUES(?,?,?,?,100,3,?,?)`).run(id, user, 'Cours', 'cours.pdf', '2026-10-13T10:00:00Z', '2026-10-13T10:00:00Z');
    db.prepare('INSERT INTO study_sections VALUES(?,?,?,?,?,?,?,?,?)').run('section', 'd', 'u', 'Chapitre', 1, 1, 3, 'Le rein filtre le plasma sanguin.', 10);
    return db;
}
function snapshot(db) {
    const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'study_v2_%' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    return Object.fromEntries(tables.map(({ name }) => [name, db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all()]));
}
test('Study V2 : migration répétable, données et historique FSRS conservés', () => {
    const db = fixture(), repo = new FlashcardRepository(db);
    const deck = repo.createDeck('u', { name: 'Mes révisions' });
    for (const [type, fields] of [['basic', { front: 'Que filtre le rein ?', back: 'Le plasma sanguin.' }], ['cloze', { text: 'Le rein filtre le {{c1::plasma sanguin}}.' }], ['typed', { front: 'Quel organe filtre le plasma ?', answer: 'rein' }]])
        repo.createNote('u', { defaultDeckId: deck.id, noteType: type, fields, source: { type: 'study_document', documentId: 'd', sectionId: 'section', excerpt: 'Le rein filtre le plasma sanguin.' } });
    const card = db.prepare('SELECT id FROM flashcards LIMIT 1').get().id;
    db.prepare("UPDATE flashcard_reviews SET fsrs_stability=12.5,fsrs_difficulty=4,fsrs_reps=8,review_version=7,state='review' WHERE card_id=?").run(card);
    db.prepare('INSERT INTO flashcard_review_logs(id,card_id,user_id,rating,reviewed_at,previous_due_at,previous_interval_days,next_due_at,next_interval_days) VALUES(?,?,?,?,?,?,?,?,?)').run('log', card, 'u', 'good', 1000, 800, 2, 2000, 4);
    const before = snapshot(db);
    migrateStudyV2(db, 1700000000000);
    db.prepare('UPDATE study_v2_document_meta SET reading_page=3,archived_at=1700000000010 WHERE document_id=?').run('d');
    migrateStudyV2(db, 1700000000020);
    assert.deepEqual(snapshot(db), before);
    assert.deepEqual(db.prepare('SELECT version FROM study_v2_migrations').all().map(row => row.version), [1, 2, 3, 4]);
    assert.equal(db.prepare('SELECT reading_page FROM study_v2_document_meta WHERE document_id=?').get('d').reading_page, 3);
    assert.equal(db.prepare('SELECT created_at FROM study_v2_document_meta WHERE document_id=?').get('d').created_at, 1700000000000);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    db.close();
});
test('Study V2 : la base refuse les associations entre propriétaires', () => {
    const db = fixture();
    migrateStudyV2(db, 1000);
    db.prepare('INSERT INTO study_v2_folders VALUES(?,?,?,?,?,?,?)').run('subject', 'other', null, 'subject', 'Anatomie', 1000, 1000);
    assert.throws(() => db.prepare('INSERT INTO study_v2_folders VALUES(?,?,?,?,?,?,?)').run('chapter', 'u', 'subject', 'chapter', 'Rein', 1000, 1000), /owner mismatch/);
    assert.throws(() => db.prepare('UPDATE study_v2_document_meta SET folder_id=? WHERE document_id=?').run('subject', 'd'), /owner mismatch/);
    assert.throws(() => db.prepare('UPDATE study_v2_document_meta SET user_id=? WHERE document_id=?').run('other', 'd'), /FOREIGN KEY/);
    assert.throws(() => db.prepare("INSERT INTO study_v2_jobs(id,document_id,user_id,request_id,kind,created_at,updated_at) VALUES('job','d','other','request','extract',1000,1000)").run(), /FOREIGN KEY/);
    db.close();
});
test('Study V2 : suppression du compte cascade les données complémentaires, sans bloquer les autres comptes', () => {
    const db = fixture();
    migrateStudyV2(db, 1000);
    db.prepare('INSERT INTO study_v2_folders VALUES(?,?,?,?,?,?,?)').run('subject', 'u', null, 'subject', 'Anatomie', 1000, 1000);
    db.prepare('INSERT INTO study_v2_folders VALUES(?,?,?,?,?,?,?)').run('chapter', 'u', 'subject', 'chapter', 'Rein', 1000, 1000);
    db.prepare('UPDATE study_v2_document_meta SET folder_id=? WHERE document_id=?').run('chapter', 'd');
    db.prepare("INSERT INTO study_v2_jobs(id,document_id,user_id,request_id,kind,created_at,updated_at) VALUES('job','d','u','request','extract',1000,1000)").run();
    db.exec("DELETE FROM users WHERE id='u'");
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_v2_jobs').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_v2_folders').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_documents').get().n, 1);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    db.close();
});
test('Study V2 : une migration interrompue est intégralement annulée', () => {
    const db = fixture();
    db.exec('CREATE TABLE study_v2_jobs(dummy TEXT)');
    assert.throws(() => migrateStudyV2(db, 1000), /already exists/);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_schema WHERE name='study_v2_migrations'").get().n, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_schema WHERE name='study_v2_document_meta'").get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM study_documents').get().n, 2);
    db.close();
});

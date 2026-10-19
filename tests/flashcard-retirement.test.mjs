import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {initFlashcardSchema} from '../server/flashcards/schema.mjs'
import {migrateFlashcards} from '../server/flashcards/migrations.mjs'
import {FlashcardRepository} from '../server/flashcards/repository.mjs'
import {validateNote,validateCard} from '../server/flashcards/validation.mjs'
import {deriveCardsFromNote,NOTE_TYPES,CARD_TYPES} from '../server/flashcards/derivation.mjs'

test('retired 3D note/card types are rejected, all six classical note formats remain supported',()=>{
 assert.equal(NOTE_TYPES.size,6);assert.equal(CARD_TYPES.has('atlas_3d'),false)
 assert.equal(validateNote({noteType:'atlas_3d',title:'Retired',fields:{}}),null)
 assert.equal(validateCard({deckId:'deck',front:'Question',back:'Réponse',visual:{type:'atlas_3d',structureId:'FMA7088'}}),null)
 assert.throws(()=>deriveCardsFromNote('atlas_3d',{}),/non supporté/)
 assert.ok(validateNote({noteType:'basic',title:'Manuelle',fields:{front:'Question',back:'Réponse'}}))
})
test('retirement preserves text, owners, IDs and FSRS; splits former targets without affecting classical cards and is idempotent',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=OFF')
 initFlashcardSchema(db);migrateFlashcards(db)
 const repo=new FlashcardRepository(db)
 const deck=repo.createDeck('alice',{name:'Anatomie'})
 const note=repo.createNote('alice',{defaultDeckId:deck.id,noteType:'bidirectional',title:'Cœur',fields:{front:'Identifier le cœur',back:'Cœur et précisions'},tags:['cardio']})
 const ordinary=repo.createNote('bob',{defaultDeckId:repo.createDeck('bob',{name:'Cours'}).id,noteType:'basic',fields:{front:'Classique',back:'Réponse'}})
 const classicalBefore=db.prepare('SELECT * FROM flashcards WHERE id=?').get(ordinary.cards[0].id)
 db.prepare("UPDATE flashcard_notes SET note_type='atlas_3d',fields_json=?,visual_json=? WHERE id=?").run(JSON.stringify({prompt:'Identifier le cœur',scene:{modelKey:'bp3d_detail'},targets:[{id:'t1',structureId:'FMA7088'}]}),JSON.stringify({type:'atlas_3d'}),note.id)
 db.prepare("UPDATE flashcards SET card_type='atlas_3d',visual_json=? WHERE note_id=?").run(JSON.stringify({type:'atlas_3d'}),note.id)
 const cardsBefore=db.prepare('SELECT * FROM flashcards WHERE note_id=? ORDER BY created_at,id').all(note.id)
 const reviewsBefore=db.prepare('SELECT * FROM flashcard_reviews ORDER BY card_id').all()
 db.exec('DELETE FROM flashcard_migrations WHERE version=6')
 migrateFlashcards(db)
 for(const card of cardsBefore){const after=db.prepare('SELECT * FROM flashcards WHERE id=?').get(card.id);assert.equal(after.front,card.front);assert.equal(after.back,card.back);assert.equal(after.user_id,card.user_id);assert.equal(after.card_type,'basic');assert.equal(after.visual_json,null)}
 assert.equal(db.prepare('SELECT count(*) n FROM flashcards WHERE note_id=?').get(note.id).n,1)
 assert.equal(db.prepare('SELECT note_type FROM flashcard_notes WHERE id=?').get(note.id).note_type,'basic')
 assert.deepEqual(db.prepare('SELECT * FROM flashcard_reviews ORDER BY card_id').all(),reviewsBefore)
 assert.deepEqual(db.prepare('SELECT * FROM flashcards WHERE id=?').get(ordinary.cards[0].id),classicalBefore)
 const archive=db.prepare('SELECT * FROM flashcard_retired_content').all();assert.equal(archive.length,1);assert.equal(archive[0].user_id,'alice');assert.equal(JSON.parse(archive[0].snapshot_json).cards.length,2)
 const after=db.prepare('SELECT * FROM flashcards ORDER BY id').all();migrateFlashcards(db);assert.deepEqual(db.prepare('SELECT * FROM flashcards ORDER BY id').all(),after)
 assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');db.close()
})

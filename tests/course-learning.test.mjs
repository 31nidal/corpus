import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {initStudySchema} from '../server/study.mjs'
import {learningOverview,updateLearningDocument,saveLearningAttempt,questionEvidence} from '../server/study/learning.mjs'
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec(`PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('alice'),('bob');`);initStudySchema(db)
 for(const user of ['alice','bob']){
 db.prepare('INSERT INTO study_documents VALUES(?,?,?,?,?,?,?,?,?,?)').run('doc-'+user,user,'Cours','cours.pdf',100,3,'ready',null,'2026-10-28','2026-10-28')
 db.prepare('INSERT INTO study_sections VALUES(?,?,?,?,?,?,?,?,?)').run('sec-'+user,'doc-'+user,user,'Innervation',0,1,3,'Le nerf phrénique innerve le diaphragme.',20)
 db.prepare('INSERT INTO study_pdf_pages VALUES(?,?,?,?)').run('doc-'+user,user,2,'Le nerf phrénique innerve le diaphragme.')
 db.prepare('INSERT INTO study_questions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('q-'+user,'doc-'+user,user,'sec-'+user,1,3,'Quel muscle ?',JSON.stringify(['Diaphragme','Langue','Pharynx']),'[0]','["Justification"]','Le nerf phrénique innerve le diaphragme.','essentiel','single','2026-10-28')
 }
 return db
}
test('citations : page réelle retrouvée et aucune page inventée pour les anciens documents',()=>{
 const db=fixture();const q={sourceSectionId:'sec-alice',sourceExcerpt:'Le nerf phrénique innerve le diaphragme.'}
 assert.deepEqual(questionEvidence(db,'alice','doc-alice',q),{verified:true,page:2})
 db.exec("DELETE FROM study_pdf_pages WHERE user_id='alice'")
 assert.deepEqual(questionEvidence(db,'alice','doc-alice',q),{verified:true,page:null})
 assert.deepEqual(questionEvidence(db,'alice','doc-alice',{...q,sourceExcerpt:'Le nerf phrénique innerve la langue.'}),{verified:false,page:null})
 assert.deepEqual(questionEvidence(db,'bob','doc-alice',q),{verified:false,page:null});db.close()
})
test('réponses : score calculé côté serveur, validation et idempotence après erreur réseau',()=>{
 const db=fixture(),body={id:'attempt-00001',questionId:'q-alice',answers:[1]}
 const saved=saveLearningAttempt(db,'alice','doc-alice',body);assert.equal(saved.correct,false)
 assert.deepEqual(saveLearningAttempt(db,'alice','doc-alice',body),saved)
 assert.equal(learningOverview(db,'alice').history.length,1)
 assert.throws(()=>saveLearningAttempt(db,'alice','doc-alice',{...body,answers:[0]}),{status:409})
 for(const answers of [[-1],[3],[0,0],[],['0']])assert.throws(()=>saveLearningAttempt(db,'alice','doc-alice',{...body,id:'invalid-12345',answers}),{status:400})
 assert.throws(()=>saveLearningAttempt(db,'alice','doc-alice',{...body,correct:true}),{status:400})
 assert.equal(saveLearningAttempt(db,'alice','doc-alice',{...body,id:'attempt-00002',answers:[0]}).correct,true)
 db.close()
})
test('isolation des matières et tentatives, sources invalides refusées, suppression en cascade du document',()=>{
 const db=fixture();updateLearningDocument(db,'alice','doc-alice',{subject:'Anatomie',opened:true})
 const a=learningOverview(db,'alice'),b=learningOverview(db,'bob');assert.equal(a.metadata[0].subject,'Anatomie');assert.equal(b.metadata.length,0);assert.equal(b.questions.length,1)
 assert.throws(()=>saveLearningAttempt(db,'bob','doc-alice',{id:'attempt-cross',questionId:'q-alice',answers:[0]}),{status:404})
 db.exec("UPDATE study_questions SET source_excerpt='Une citation inventée qui ne figure pas dans le cours.' WHERE id='q-alice'")
 assert.throws(()=>saveLearningAttempt(db,'alice','doc-alice',{id:'attempt-proof',questionId:'q-alice',answers:[0]}),{status:422})
 db.exec("DELETE FROM study_documents WHERE id='doc-alice'");assert.equal(learningOverview(db,'alice').metadata.length,0);assert.equal(learningOverview(db,'bob').questions.length,1);db.close()
})

test('API : authentification, origine, propriété du PDF et corps JSON contrôlés',async()=>{
 const {createStudyHandler}=await import('../server/study.mjs'),{Readable}=await import('node:stream'),{createHash}=await import('node:crypto')
 const db=fixture();db.exec(`ALTER TABLE users ADD COLUMN name TEXT;ALTER TABLE users ADD COLUMN email TEXT;CREATE TABLE sessions(token TEXT,user_id TEXT,expires INTEGER);`)
 db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update('token-test').digest('hex'),'alice',Date.now()+60000)
 const handle=createStudyHandler({APP_ORIGIN:'http://test.local'},{db})
 async function call(path,body,headers={}){
  const req=Readable.from(body===undefined?[]:[typeof body==='string'?body:JSON.stringify(body)]);req.url='/api/study/'+path;req.method=body===undefined?'GET':'POST';req.headers={host:'test.local',cookie:'mycorpus_session=token-test','x-mycorpus-request':'1',...headers}
  let status,result;await handle(req,{writeHead(s){status=s},end(text){result=JSON.parse(text)}});return {status,data:result}
 }
 assert.equal((await call('learning',undefined,{cookie:''})).status,401)
 assert.equal((await call('documents/doc-bob/learning',{subject:'Volé'})).status,404)
 assert.equal((await call('documents/doc-alice/learning',{subject:'Biologie'},{origin:'http://evil.local'})).status,403)
 assert.equal((await call('documents/doc-alice/learning','{')).status,400)
 assert.equal((await call('documents/doc-alice/learning',{subject:'Biologie'})).status,200)
 assert.equal((await call('learning')).data.metadata[0].subject,'Biologie')
 const response=await call('documents/doc-alice/questions');assert.deepEqual(response.data.questions[0].sourceEvidence,{verified:true,page:2})
 assert.equal((await call('documents/doc-alice/attempts',{id:'attempt-api-1',questionId:'q-bob',answers:[0]})).status,404)
 assert.equal((await call('documents/doc-alice/attempts',{id:'attempt-api-1',questionId:'q-alice',answers:[0]})).data.correct,true)
 db.close()
})

test('interrogation : le contrat QCM appelle Gemini avec le chapitre demandé et persiste une preuve vérifiable',async()=>{
 const {createStudyHandler}=await import('../server/study.mjs'),{Readable}=await import('node:stream'),{createHash}=await import('node:crypto')
 const db=fixture();db.exec(`ALTER TABLE users ADD COLUMN name TEXT;ALTER TABLE users ADD COLUMN email TEXT;CREATE TABLE sessions(token TEXT,user_id TEXT,expires INTEGER);`)
 db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update('token-test').digest('hex'),'alice',Date.now()+60000)
 const calls=[]
 const provider={name:'gemini',async generateStudyQuestions(context){calls.push(context);return [{prompt:'Quel muscle est innervé par le nerf phrénique ?',options:['Diaphragme','Langue','Pharynx'],correct:[0],why:['Le cours atteste cette innervation.','Autre nerf.','Autre nerf.'],sourceSectionId:'sec-alice',sourceExcerpt:'Le nerf phrénique innerve le diaphragme.'}]}}
 const handler=createStudyHandler({}, {db,provider})
 const request=async(method,body)=>{const req=Readable.from(body?[JSON.stringify(body)]:[]);req.url='/api/study/documents/doc-alice/questions';req.method=method;req.headers={host:'localhost',cookie:'mycorpus_session=token-test','x-mycorpus-request':'1'};let status,data;await handler(req,{writeHead(s){status=s},end(text){data=JSON.parse(text)}});return {status,data}}
 const generated=await request('POST',{count:3,sectionId:'sec-alice',replace:false})
 assert.equal(generated.status,201);assert.equal(calls.length,1);assert.equal(calls[0].count,3);assert.deepEqual(calls[0].sections.map(s=>s.id),['sec-alice'])
 const stored=await request('GET');assert.equal(stored.status,200);assert.equal(stored.data.questions.length,2)
 assert.deepEqual(stored.data.questions.at(-1).sourceEvidence,{verified:true,page:2})
 assert.equal(db.prepare("SELECT generations_used FROM study_quotas WHERE user_id='alice'").get().generations_used,1)
 db.close()
})

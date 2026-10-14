import test from 'node:test'
import assert from 'node:assert/strict'
import {fixture,register,imported} from './helpers/study-v2-api.mjs'
import {questionSettings,validateQuestion,verificationResult,MAX_QUESTIONS_PER_SET} from '../server/study/v2/question-validation.mjs'
import {GeminiPedagogy} from '../server/ai/pedagogy.mjs'
import {DatabaseSync} from 'node:sqlite'
import {initStudySchema} from '../server/study.mjs'
import {migrateStudyV2} from '../server/study/v2/schema.mjs'
import {StudyQuestions,QUESTION_LEASE_MS,MAX_QUESTION_SETS_PER_DOCUMENT} from '../server/study/v2/questions.mjs'
import {QuestionTraining} from '../server/study/v2/question-training.mjs'

const source='Le rein filtre le plasma sanguin et assure la filtration glomérulaire.'
const option=(text,correct,id)=>({text,correct,relation:correct?'supports':'contradicts',explanation:correct?'Le cours attribue explicitement la filtration glomérulaire au rein.':'Cette attribution est contredite par le cours, qui décrit la filtration assurée par le rein.',sourceSectionId:id,sourceExcerpt:source})
const candidate=(id,format='single')=>({prompt:'Quelles propositions décrivent le rein selon le cours ?',options:[option('Le rein filtre le plasma sanguin.',true,id),option('Le rein ne filtre pas le plasma sanguin.',false,id),option(format==='multiple'?'Le rein assure la filtration glomérulaire.':'Le rein n’assure pas la filtration glomérulaire.',format==='multiple',id)]})
const verification=question=>({coherent:true,reason:'Les preuves impliquent les bonnes réponses et contredisent explicitement les négations.',options:question.options.map((option,index)=>({index,adequate:true,relation:option.relation,reason:'La relation découle de la proposition et du passage source pour cet énoncé.'}))})
function provider(){return {name:'gemini',async generateDocumentQuestions(context){const question=candidate(context.sections[0].id,context.settings.format);return {questions:[{...question,verification:{...verification(question),passed:true}}],generation:{mode:'gemini'}}}}}
async function setup(options={provider:provider()}){
  const api=fixture(options),cookie=await register(api),other=await register(api),doc=(await imported(api,cookie)).document.id
  await api.drain()
  const route=`/api/study/v2/documents/${doc}/question-sets`
  const created=await api.call(route,{method:'POST',cookie,body:{requestId:'qcm',count:2,format:'multiple'}})
  assert.equal(created.status,202)
  await api.drain()
  const set=(await api.call(route+'/'+created.data.set.id,{cookie})).data.set
  return {api,cookie,other,doc,route,set,created}
}
test('QCM V2 : génération persistée, demande idempotente, sources et relecture avant entraînement',async()=>{
  const ctx=await setup(),{api,cookie,route,set}=ctx
  try{
    assert.equal(set.questions.length,1);assert.equal(set.questions[0].status,'draft')
    assert.equal(set.jobs[0].state,'succeeded');assert.equal(set.questions[0].validation.passed,true)
    assert.equal(set.questions[0].options[0].page,1)
    const again=await api.call(route,{method:'POST',cookie,body:{requestId:'qcm',count:2,format:'multiple'}})
    assert.equal(again.data.set.id,set.id);assert.equal(again.data.reused,true)
    assert.equal((await api.call(route,{method:'POST',cookie,body:{requestId:'qcm',count:3,format:'multiple'}})).status,409)
    assert.equal((await api.call(route+'/'+set.id+'/train',{method:'POST',cookie,body:{requestId:'train',mode:'deferred'}})).status,409)
    const question=set.questions[0],qroute=route+'/'+set.id+'/questions/'+question.id
    assert.equal((await api.call(qroute,{method:'PATCH',cookie,body:{expectedVersion:question.version,status:'validated'}})).status,400)
    const validated=await api.call(qroute,{method:'PATCH',cookie,body:{expectedVersion:question.version,status:'validated',reviewConfirmed:true}})
    assert.equal(validated.status,200);assert.equal(validated.data.question.validation.humanReviewed,true)
    const modified=await api.call(qroute,{method:'PATCH',cookie,body:{expectedVersion:validated.data.question.version,content:{...question,prompt:question.prompt+' Relu.'}}})
    assert.equal(modified.status,200);assert.equal(modified.data.question.status,'draft');assert.equal(modified.data.question.validation.passed,false)
    assert.equal((await api.call(qroute,{method:'PATCH',cookie,body:{expectedVersion:1,status:'rejected'}})).status,409)
  }finally{await api.close()}
})
test('QCM V2 : chaque route est scopée, y compris génération, régénération et entraînement',async()=>{
  const {api,cookie,other,route,set,doc,created}=await setup()
  try{
    const q=set.questions[0],url=route+'/'+set.id
    await api.call(url+'/questions/'+q.id,{method:'PATCH',cookie,body:{expectedVersion:q.version,status:'validated',reviewConfirmed:true}})
    const train=await api.call(url+'/train',{method:'POST',cookie,body:{requestId:'owner',mode:'immediate'}})
    assert.equal(train.status,201)
    const training=`/api/study/v2/documents/${doc}/training`,attempt=training+'/'+train.data.attempt.id
    for(const [path,method,body]of [[route,'GET'],[route,'POST',{requestId:'intrus'}],[url,'GET'],[url,'DELETE'],[url+'/questions/'+q.id,'PATCH',{}],[url+'/questions/'+q.id+'/regenerate','POST',{}],[url+'/train','POST',{}],[`/api/study/v2/documents/${doc}/question-jobs/${created.data.job.id}`,'GET'],[training,'GET'],[attempt,'GET'],[attempt+'/answer','POST',{}],[attempt+'/finish','POST',{}]])assert.equal((await api.call(path,{method,body,cookie:other})).status,404,path)
    assert.equal((await api.call(route,{cookie:''})).status,401)
    assert.equal((await api.call(route,{method:'POST',cookie,body:{},headers:{origin:'https://intrus.example'}})).status,403)
  }finally{await api.close()}
})
test('QCM V2 : score multi exact, correction différée, réponses idempotentes et historique persistant',async()=>{
  const {api,cookie,route,set,doc}=await setup()
  try{
    const q=set.questions[0],url=route+'/'+set.id
    await api.call(url+'/questions/'+q.id,{method:'PATCH',cookie,body:{expectedVersion:q.version,status:'validated',reviewConfirmed:true}})
    const body={requestId:'training',mode:'deferred'},start=await api.call(url+'/train',{method:'POST',cookie,body})
    const attempt=start.data.attempt,id=attempt.id,turl=`/api/study/v2/documents/${doc}/training/${id}`
    assert.equal((await api.call(url+'/train',{method:'POST',cookie,body})).data.attempt.id,id)
    assert.ok(attempt.questions[0].options.every(option=>Object.keys(option).join()==='text'))
    assert.equal(attempt.score,null)
    const answer={questionId:q.id,selected:[0,2]}
    const answered=await api.call(turl+'/answer',{method:'POST',cookie,body:answer})
    assert.equal(answered.status,200);assert.equal(answered.data.attempt.questions[0].isCorrect,undefined)
    assert.ok(answered.data.attempt.questions[0].options.every(option=>option.explanation===undefined))
    assert.equal((await api.call(turl+'/answer',{method:'POST',cookie,body:answer})).status,200)
    assert.equal((await api.call(turl+'/answer',{method:'POST',cookie,body:{questionId:q.id,selected:[0]}})).status,409)
    const finished=await api.call(turl+'/finish',{method:'POST',cookie,body:{}})
    assert.equal(finished.data.attempt.score,1);assert.ok(finished.data.attempt.questions[0].options[0].explanation)
    assert.equal((await api.call(turl+'/finish',{method:'POST',cookie,body:{}})).data.attempt.finishedAt,finished.data.attempt.finishedAt)
    assert.equal((await api.call(`/api/study/v2/documents/${doc}/training`,{cookie})).data.attempts[0].score,1)
    await api.call(url+'/questions/'+q.id,{method:'PATCH',cookie,body:{expectedVersion:2,status:'rejected'}})
    assert.equal((await api.call(turl,{cookie})).data.attempt.score,1)
    await api.call(`/api/study/documents/${doc}`,{method:'DELETE',cookie})
    assert.equal((await api.call(turl,{cookie})).status,404)
  }finally{await api.close()}
})
test('QCM V2 : correction immédiate après réponse seulement et réponse unique contrôlée',async()=>{
  const {api,cookie,route,set,doc}=await setup()
  try{
    const q=set.questions[0],url=route+'/'+set.id
    await api.call(url+'/questions/'+q.id,{method:'PATCH',cookie,body:{expectedVersion:1,status:'validated',reviewConfirmed:true}})
    const started=await api.call(url+'/train',{method:'POST',cookie,body:{requestId:'immediate',mode:'immediate'}})
    const turl=`/api/study/v2/documents/${doc}/training/${started.data.attempt.id}`
    assert.equal(started.data.attempt.questions[0].options[0].correct,undefined)
    const answered=await api.call(turl+'/answer',{method:'POST',cookie,body:{questionId:q.id,selected:[0]}})
    assert.equal(answered.data.attempt.questions[0].isCorrect,false)
    assert.equal((await api.call(turl+'/answer',{method:'POST',cookie,body:{questionId:q.id,selected:[99]}})).status,400)
  }finally{await api.close()}
})
test('QCM V2 : régénération ciblée ne touche aucune autre question et invalide la relecture',async()=>{
  const {api,cookie,route,set}=await setup()
  try{
    const q=set.questions[0],url=route+'/'+set.id+'/questions/'+q.id
    await api.call(url,{method:'PATCH',cookie,body:{expectedVersion:1,status:'validated',reviewConfirmed:true}})
    const body={requestId:'regenerate',expectedVersion:2}
    const regenerated=await api.call(url+'/regenerate',{method:'POST',cookie,body})
    assert.equal(regenerated.status,202)
    await api.drain()
    const after=(await api.call(route+'/'+set.id,{cookie})).data.set
    assert.equal(after.questions.length,1);assert.equal(after.questions[0].id,q.id);assert.equal(after.questions[0].version,3);assert.equal(after.questions[0].status,'draft')
    assert.equal((await api.call(url+'/regenerate',{method:'POST',cookie,body})).data.job.id,regenerated.data.job.id)
  }finally{await api.close()}
})
test('QCM V2 : erreurs Gemini conservées, aucune génération locale trompeuse, sans relance implicite',async()=>{
  let calls=0
  const {api,cookie,route,set}=await setup({provider:{name:'gemini',async generateDocumentQuestions(){calls++;throw Object.assign(new Error('Gemini indisponible.'),{code:'AI_TIMEOUT',status:503})}}})
  try{
    assert.equal(set.jobs[0].state,'failed');assert.equal(set.jobs[0].errorCode,'AI_TIMEOUT');assert.equal(set.questions.length,0)
    await api.call(route,{method:'POST',cookie,body:{requestId:'qcm',count:2,format:'multiple'}});await api.drain();assert.equal(calls,1)
  }finally{await api.close()}
  const local=await setup({provider:null})
  try{assert.equal(local.set.jobs[0].errorCode,'AI_REQUIRED');assert.equal(local.set.questions.length,0)}finally{await local.api.close()}
})
test('QCM V2 : preuve inventée et contrôle indépendant insuffisant refusés',()=>{
  const settings=questionSettings({}),scope={sections:[{id:'s',content:source,startPage:1,endPage:1}],pages:[{page:1,text:source}]}
  const question=validateQuestion(candidate('s'),scope,settings)
  assert.equal(verificationResult(verification(question),question).passed,true)
  assert.equal(verificationResult({...verification(question),coherent:false},question).passed,false)
  assert.equal(verificationResult({...verification(question),options:[verification(question).options[0],verification(question).options[0],verification(question).options[2]]},question).passed,false)
  const forged=candidate('s');forged.options[0].sourceExcerpt='Le rein fabrique toutes les cellules sanguines.'
  assert.throws(()=>validateQuestion(forged,scope,settings),error=>error.status===422)
  for(const count of [0,31,1.5])assert.throws(()=>questionSettings({count}),error=>error.status===400)
  assert.equal(questionSettings({count:1}).count,1);assert.equal(questionSettings({count:MAX_QUESTIONS_PER_SET}).count,30)
})
test('QCM V2 Gemini : deux appels distincts, usage agrégé et rejet d’une incohérence sémantique',async()=>{
  const calls=[]
  const client={model:'fixture',async json({data,onUsage}){
    calls.push(data);onUsage({attempts:1,inputTokens:100,outputTokens:50,estimatedUsd:.001,usageKnown:true})
    if(data.question)return verification(data.question)
    return {questions:[candidate('s')]}
  }}
  const provider=new GeminiPedagogy({}, {client}),context={sections:[{id:'s',content:source,startPage:1,endPage:1}],settings:questionSettings({count:1})}
  const result=await provider.generateDocumentQuestions(context)
  assert.equal(calls.length,2);assert.equal(result.generation.usage.attempts,2);assert.equal(result.questions[0].verification.passed,true)
  client.json=async({data})=>data.question?{...verification(data.question),coherent:false}:{questions:[candidate('s')]}
  await assert.rejects(()=>provider.generateDocumentQuestions(context),error=>error.code==='AI_NO_GROUNDED_RESULT'&&error.generation.rejectionReasons.independent_verification===1)
})

function repository(options={}){
  const db=new DatabaseSync(':memory:')
  db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u'),('other');")
  initStudySchema(db)
  db.prepare("INSERT INTO study_documents(id,user_id,title,filename,file_size,page_count,created_at,updated_at) VALUES('d','u','Rein','rein.pdf',100,1,'2026-10-14','2026-10-14')").run()
  db.prepare('INSERT INTO study_sections VALUES(?,?,?,?,?,?,?,?,?)').run('s','d','u','Rein',1,1,1,source,30)
  db.prepare('INSERT INTO study_pdf_pages VALUES(?,?,?,?)').run('d','u',1,source)
  migrateStudyV2(db)
  const questions=new StudyQuestions({db,provider:provider(),...options}),training=new QuestionTraining({db,questions})
  return {db,questions,training,async close(){await questions.close();db.close()}}
}
test('QCM V2 : interruption, contraintes source, cascade et plafond sans perte des données',async()=>{
  const ctx=repository()
  try{
    const created=ctx.questions.create('u','d',{requestId:'interrupted'})
    ctx.db.prepare("UPDATE study_v2_question_jobs SET state='running',lease_until=0 WHERE id=?").run(created.job.id)
    ctx.questions.pump()
    assert.equal(ctx.questions.job('u','d',created.job.id).state,'interrupted')
    assert.equal(QUESTION_LEASE_MS,60000)
    assert.throws(()=>ctx.db.prepare("UPDATE study_v2_question_sets SET scope_json='{}'").run(),/immutable/)
    for(let i=1;i<MAX_QUESTION_SETS_PER_DOCUMENT;i++)ctx.db.prepare("INSERT INTO study_v2_question_sets VALUES(?,?,?,?,?,?,'{}',1,1)").run('limit-'+i,'d','u','Titre',1,'{}')
    assert.throws(()=>ctx.questions.create('u','d',{requestId:'limit'}),error=>error.status===403)
    ctx.db.exec("DELETE FROM study_documents WHERE id='d'")
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM study_v2_question_jobs').get().n,0)
    assert.deepEqual(ctx.db.prepare('PRAGMA foreign_key_check').all(),[])
  }finally{await ctx.close()}
})
test('QCM V2 : édition pendant une régénération préservée et quota restitué en cas de conflit',async()=>{
  let unblock,entered
  const started=new Promise(resolve=>{entered=resolve})
  let delayed=false
  const ctx=repository({provider:{name:'gemini',async generateDocumentQuestions(context){
    if(delayed){entered();await new Promise(resolve=>{unblock=resolve})}
    return provider().generateDocumentQuestions(context)
  }}})
  try{
    const initial=ctx.questions.create('u','d',{requestId:'initial'})
    await ctx.questions.drain()
    const question=ctx.questions.get('u','d',initial.set.id).questions[0]
    delayed=true
    const job=ctx.questions.regenerate('u','d',initial.set.id,question.id,{requestId:'delayed',expectedVersion:1})
    await started
    ctx.questions.patch('u','d',initial.set.id,question.id,{expectedVersion:1,content:{...question,prompt:question.prompt+' Modification humaine conservée.'}})
    unblock();await ctx.questions.drain()
    const saved=ctx.questions.get('u','d',initial.set.id).questions[0]
    assert.match(saved.prompt,/Modification humaine conservée/);assert.equal(saved.version,2)
    assert.equal(ctx.questions.job('u','d',job.job.id).state,'failed')
    assert.equal(ctx.db.prepare("SELECT generations_used FROM study_quotas WHERE user_id='u'").get().generations_used,1)
  }finally{unblock?.();await ctx.close()}
})
test('QCM V2 : format unique, refus du multi, score et snapshot immuable après édition',async()=>{
  const ctx=repository()
  try{
    const set=ctx.questions.create('u','d',{requestId:'single',format:'single'}).set
    await ctx.questions.drain()
    const question=ctx.questions.get('u','d',set.id).questions[0]
    ctx.questions.patch('u','d',set.id,question.id,{expectedVersion:1,status:'validated',reviewConfirmed:true})
    const attempt=ctx.training.create('u','d',set.id,{requestId:'single-train',mode:'immediate'})
    assert.throws(()=>ctx.training.answer('u','d',attempt.id,{questionId:question.id,selected:[0,1]}),error=>error.status===400)
    assert.throws(()=>ctx.db.prepare("UPDATE study_v2_training_attempts SET snapshot_json='[]'").run(),/immutable/)
    const answered=ctx.training.answer('u','d',attempt.id,{questionId:question.id,selected:[0]})
    assert.equal(answered.questions[0].isCorrect,true)
    ctx.questions.patch('u','d',set.id,question.id,{expectedVersion:2,content:{...question,prompt:question.prompt+' Nouvelle formulation.'}})
    assert.equal(ctx.training.get('u','d',attempt.id).questions[0].prompt,question.prompt)
    assert.equal(ctx.training.finish('u','d',attempt.id).score,1)
  }finally{await ctx.close()}
})

test('QCM V2 Gemini : lot borné, contrôle distinct et attribution par index même en ordre inversé',async()=>{
  const calls=[],questions=Array.from({length:5},(_,index)=>({...candidate('s'),prompt:`Question médicale numéro ${index+1} : quelles propositions décrivent le rein ?`}))
  const client={model:'fixture',async json({data,onUsage}){
    calls.push(data);onUsage({attempts:1,inputTokens:100,outputTokens:50,estimatedUsd:.001,usageKnown:true})
    if(data.question)return verification(data.question)
    if(data.questions)return {questions:data.questions.map(({index,question})=>({index,...verification(question),coherent:index!==1})).reverse()}
    return {questions}
  }}
  const result=await new GeminiPedagogy({}, {client}).generateDocumentQuestions({sections:[{id:'s',content:source,startPage:1,endPage:1}],settings:questionSettings({count:5})})
  assert.equal(calls.length,3);assert.equal(calls[1].questions.length,4)
  assert.equal(result.questions.length,4);assert.ok(!result.questions.some(question=>question.prompt.includes('numéro 2')))
  assert.equal(result.generation.rejectionReasons.independent_verification,1)
  assert.equal(result.generation.usage.attempts,3)
})
test('QCM V2 Gemini : index de vérification dupliqué ou manquant ne valide aucune question du lot',async()=>{
  const questions=[candidate('s'),{...candidate('s'),prompt:'Quel organe assure la filtration glomérulaire selon le cours ?'}]
  for(const indexes of [[0,0],[1]]){
    const client={model:'fixture',async json({data}){return data.questions?{questions:indexes.map(index=>({index,...verification(questions[0])}))}:{questions}}}
    await assert.rejects(()=>new GeminiPedagogy({}, {client}).generateDocumentQuestions({sections:[{id:'s',content:source,startPage:1,endPage:1}],settings:questionSettings({count:2})}),error=>error.code==='AI_NO_GROUNDED_RESULT'&&error.generation.rejectionReasons.independent_verification===2)
  }
})

test('QCM V2 Gemini : un candidat refusé ne bloque pas un QCM pertinent de même énoncé dans une section suivante',async()=>{
  const client={model:'fixture',async json({data}){
    if(data.question)return {...verification(data.question),coherent:data.question.options[0].sourceSectionId==='last'}
    return {questions:[candidate(data.fragments[0].sectionId)]}
  }}
  const result=await new GeminiPedagogy({}, {client}).generateDocumentQuestions({sections:[{id:'first',content:source.padEnd(16000,' '),startPage:1,endPage:1},{id:'last',content:source,startPage:2,endPage:2}],settings:questionSettings({count:2})})
  assert.equal(result.questions.length,1)
  assert.equal(result.questions[0].options[0].sourceSectionId,'last')
  assert.equal(result.generation.rejectionReasons.independent_verification,1)
})

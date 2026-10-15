import test from 'node:test'
import assert from 'node:assert/strict'
import {fixture,register,imported} from './helpers/study-v2-api.mjs'
import {GeminiPedagogy} from '../server/ai/pedagogy.mjs'
import {validateAssistantResponse} from '../server/ai/document-assistant.mjs'
import {DatabaseSync} from 'node:sqlite'
import {initStudySchema} from '../server/study.mjs'
import {migrateStudyV2} from '../server/study/v2/schema.mjs'
import {DocumentAssistant,ASSISTANT_LEASE_MS,MAX_ASSISTANT_MESSAGES} from '../server/study/v2/assistant.mjs'

const text='Le rein filtre le plasma sanguin et assure la filtration glomérulaire.'
const answer=sectionId=>({answered:true,verified:true,paragraphs:[{text,citations:[{sourceSectionId:sectionId,sourceExcerpt:text}]}],generation:{mode:'gemini'}})
const provider=()=>({name:'gemini',async answerDocument(context){return answer(context.sections[0].id)}})
async function setup(dependencies={provider:provider()}){
  const api=fixture(dependencies),cookie=await register(api),other=await register(api),doc=(await imported(api,cookie)).document.id
  await api.drain()
  const route=`/api/study/v2/documents/${doc}/assistant`,body={requestId:'conversation',title:'Fonction rénale'}
  const created=await api.call(route,{method:'POST',cookie,body})
  assert.equal(created.status,201)
  return {api,cookie,other,doc,route,thread:created.data.thread,body}
}
test('Assistant V2 : conversation et réponse persistées, citations/pages et demandes idempotentes',async()=>{
  const {api,cookie,route,thread,body}=await setup()
  try{
    assert.equal((await api.call(route,{method:'POST',cookie,body})).data.thread.id,thread.id)
    const url=route+'/'+thread.id,prompt={requestId:'answer',prompt:'Quel est le rôle du rein ?'}
    const queued=await api.call(url+'/messages',{method:'POST',cookie,body:prompt})
    assert.equal(queued.status,202);assert.equal(queued.data.message.sourceVersion,1)
    await api.drain()
    const detail=(await api.call(url,{cookie})).data.thread
    assert.equal(detail.messages.length,1);assert.equal(detail.messages[0].state,'succeeded')
    assert.equal(detail.messages[0].response.paragraphs[0].citations[0].page,1)
    assert.equal(detail.messages[0].response.paragraphs[0].citations[0].exactPage,true)
    assert.equal((await api.call(url+'/messages',{method:'POST',cookie,body:prompt})).data.message.id,queued.data.message.id)
    assert.equal((await api.call(url+'/messages',{method:'POST',cookie,body:{...prompt,prompt:'Autre question'}})).status,409)
    assert.equal((await api.call(route,{cookie})).data.threads.length,1)
  }finally{await api.close()}
})
test('Assistant V2 : propriété 404 sur chaque route, CSRF et cascade documentaire',async()=>{
  const {api,cookie,other,route,thread,doc}=await setup()
  try{
    for(const [url,method,body]of [[route,'GET'],[route,'POST',{requestId:'foreign'}],[route+'/'+thread.id,'GET'],[route+'/'+thread.id,'DELETE'],[route+'/'+thread.id+'/messages','POST',{requestId:'foreign',prompt:'Question privée'}]])assert.equal((await api.call(url,{method,body,cookie:other})).status,404)
    assert.equal((await api.call(route,{cookie:''})).status,401)
    assert.equal((await api.call(route+'/'+thread.id+'/messages',{method:'POST',cookie,body:{requestId:'csrf',prompt:'Question privée'},headers:{origin:'https://intrus.example'}})).status,403)
    await api.call(route+'/'+thread.id+'/messages',{method:'POST',cookie,body:{requestId:'own',prompt:'Quel est le rôle du rein ?'}});await api.drain()
    await api.call(`/api/study/documents/${doc}`,{method:'DELETE',cookie})
    assert.equal((await api.call(route+'/'+thread.id,{cookie})).status,404)
  }finally{await api.close()}
})
test('Assistant V2 : abstention explicite sans connaissance extérieure, erreur Gemini sans faux résultat local',async()=>{
  const abstain=await setup({provider:{name:'gemini',async answerDocument(){return {answered:false,paragraphs:[],generation:{mode:'gemini'}}}}})
  try{
    await abstain.api.call(abstain.route+'/'+abstain.thread.id+'/messages',{method:'POST',cookie:abstain.cookie,body:{requestId:'absent',prompt:'Quel est le cours de la bourse ?'}})
    await abstain.api.drain()
    const message=(await abstain.api.call(abstain.route+'/'+abstain.thread.id,{cookie:abstain.cookie})).data.thread.messages[0]
    assert.equal(message.state,'succeeded');assert.equal(message.response.answered,false);assert.match(message.response.message,/ne permet pas de répondre/)
  }finally{await abstain.api.close()}
  const local=await setup({provider:null})
  try{
    await local.api.call(local.route+'/'+local.thread.id+'/messages',{method:'POST',cookie:local.cookie,body:{requestId:'local',prompt:'Quel est le rôle du rein ?'}});await local.api.drain()
    const message=(await local.api.call(local.route+'/'+local.thread.id,{cookie:local.cookie})).data.thread.messages[0]
    assert.equal(message.state,'failed');assert.equal(message.errorCode,'AI_REQUIRED');assert.equal(message.response,null)
  }finally{await local.api.close()}
})
test('Assistant V2 : valeur, citation inventée, absence de source ou abstention avec contenu refusées',()=>{
  const scope={sections:[{id:'s',content:'La pression glomérulaire est de 44 mmHg.',startPage:2,endPage:2}],pages:[{page:2,text:'La pression glomérulaire est de 44 mmHg.'}]}
  const response=value=>({answered:true,paragraphs:[{text:value,citations:[{sourceSectionId:'s',sourceExcerpt:scope.sections[0].content}]}]})
  assert.equal(validateAssistantResponse(response('La pression glomérulaire est de 44 mmHg.'),scope).paragraphs[0].citations[0].page,2)
  assert.throws(()=>validateAssistantResponse(response('La pression glomérulaire est de 44 mL.'),scope),error=>error.code==='AI_NO_GROUNDED_RESULT')
  assert.throws(()=>validateAssistantResponse(response('La pression glomérulaire est de 99 mmHg.'),scope),error=>error.code==='AI_NO_GROUNDED_RESULT')
  assert.throws(()=>validateAssistantResponse({answered:false,paragraphs:[{text:'Invention'}]},scope),error=>error.code==='AI_INVALID_SCHEMA')
  const forged=response('La pression glomérulaire est de 44 mmHg.');forged.paragraphs[0].citations[0].sourceSectionId='foreign'
  assert.throws(()=>validateAssistantResponse(forged,scope),error=>error.code==='AI_NO_GROUNDED_RESULT')
})
test('Assistant V2 Gemini : recherche de preuves, synthèse et vérification séparées, usage agrégé',async()=>{
  const calls=[]
  const client={model:'fixture',async json({data,onUsage}){
    calls.push(data);onUsage({attempts:1,inputTokens:100,outputTokens:50,estimatedUsd:.001,usageKnown:true})
    if(data.fragments)return {evidence:[{sourceSectionId:'s',sourceExcerpt:text}]}
    if(data.evidence)return answer('s')
    return {paragraphs:[{index:0,adequate:true,reason:'Le paragraphe est impliqué par la preuve citée du cours.'}]}
  }}
  const provider=new GeminiPedagogy({}, {client}),context={prompt:'Quel est le rôle du rein ?',sections:[{id:'s',content:text,startPage:1,endPage:1}],pages:[{page:1,text}],history:[]}
  const result=await provider.answerDocument(context)
  assert.equal(calls.length,3);assert.equal(result.verified,true);assert.equal(result.generation.usage.attempts,3)
  client.json=async({data})=>data.fragments?{evidence:[{sourceSectionId:'s',sourceExcerpt:text}]}:data.evidence?answer('s'):{paragraphs:[{index:0,adequate:false,reason:'Ce raisonnement ne découle pas des citations.'}]}
  await assert.rejects(()=>provider.answerDocument(context),error=>error.code==='AI_NO_GROUNDED_RESULT')
  client.json=async()=>({evidence:[]})
  assert.equal((await provider.answerDocument(context)).answered,false)
})
test('Assistant V2 : sélection exacte en base et preuves non vérifiées ne sont pas enregistrées',async()=>{
  const {api,cookie,route,thread}=await setup({provider:{name:'gemini',async answerDocument(context){return {...answer(context.sections[0].id),verified:false}}}})
  try{
    const url=route+'/'+thread.id+'/messages'
    assert.equal((await api.call(url,{method:'POST',cookie,body:{requestId:'foreign-source',prompt:'Explique ce passage.',sectionIds:['foreign']}})).status,404)
    assert.equal((await api.call(url,{method:'POST',cookie,body:{requestId:'invented-source',prompt:'Explique ce passage.',selection:{page:1,text:'Le rein fabrique tous les globules rouges du corps humain.'}}})).status,400)
    assert.equal((await api.call(url,{method:'POST',cookie,body:{requestId:'valid-source',prompt:'Explique ce passage.',selection:{page:1,text}}})).status,202)
    await api.drain()
    const message=(await api.call(route+'/'+thread.id,{cookie})).data.thread.messages[0]
    assert.equal(message.state,'failed');assert.equal(message.response,null)
    assert.equal(message.source.selection.page,1)
  }finally{await api.close()}
})
test('Assistant V2 : interruption non relancée et limites persistées, sources immuables',async()=>{
  const db=new DatabaseSync(':memory:')
  db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u');")
  initStudySchema(db)
  db.prepare("INSERT INTO study_documents(id,user_id,title,filename,file_size,page_count,created_at,updated_at) VALUES('d','u','Rein','rein.pdf',100,1,'2026-10-14','2026-10-14')").run()
  db.prepare('INSERT INTO study_sections VALUES(?,?,?,?,?,?,?,?,?)').run('s','d','u','Rein',1,1,1,text,30)
  db.prepare('INSERT INTO study_pdf_pages VALUES(?,?,?,?)').run('d','u',1,text)
  migrateStudyV2(db)
  const assistant=new DocumentAssistant({db,provider:provider()})
  try{
    const thread=assistant.create('u','d',{requestId:'thread'}).thread
    const message=assistant.ask('u','d',thread.id,{requestId:'interrupted',prompt:'Quel est le rôle du rein ?'}).message
    db.prepare("UPDATE study_v2_assistant_messages SET state='running',lease_until=0 WHERE id=?").run(message.id)
    assistant.pump()
    assert.equal(assistant.get('u','d',thread.id).messages[0].state,'interrupted');assert.equal(ASSISTANT_LEASE_MS,60000)
    assert.throws(()=>db.prepare("UPDATE study_v2_assistant_messages SET scope_json='{}'").run(),/immutable/)
    for(let i=1;i<MAX_ASSISTANT_MESSAGES;i++)db.prepare("INSERT INTO study_v2_assistant_messages(id,thread_id,document_id,user_id,request_id,request_hash,prompt,source_version,scope_json,source_info_json,state,created_at,updated_at) VALUES(?,?,?,?,?,?,'Question',1,'{}','{}','failed',1,1)").run('limit-'+i,thread.id,'d','u','limit-'+i,'hash')
    assert.throws(()=>assistant.ask('u','d',thread.id,{requestId:'limit',prompt:'Quel est le rôle du rein ?'}),error=>error.status===403)
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[])
  }finally{await assistant.close();db.close()}
})

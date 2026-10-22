import test from 'node:test'
import assert from 'node:assert/strict'
import {GeminiPedagogy} from '../server/ai/pedagogy.mjs'
const sentences=['La glycolyse se déroule dans le cytoplasme de la cellule.','Le cycle de Krebs se déroule dans la matrice mitochondriale.','Le glucagon est une hormone sécrétée par le pancréas.']
const point=f=>({text:f.content.trim(),sourceSectionId:f.sectionId,sourceExcerpt:f.content.trim(),category:'À retenir'})
test('Grand cours : tous les blocs et la dernière section atteignent Gemini, puis synthèse globale bornée',async()=>{
 const calls=[]
 const sections=Array.from({length:24},(_,i)=>({id:`s${i}`,title:`Chapitre ${i+1}`,content:sentences[i%3].repeat(90),startPage:i*5+1,endPage:i*5+5}))
 const client={model:'gemini-test',async json({data,onUsage}){
  calls.push(data);onUsage?.({attempts:1,inputTokens:100,outputTokens:30,estimatedUsd:0,usageKnown:true})
  if(data.task==='summary-overview')return {points:[{...point(data.fragments[0]),text:sentences[0],sourceExcerpt:sentences[0]}]}
  return {points:data.fragments.map(f=>({...point(f),text:sentences[Number(f.sectionId.slice(1))%3],sourceExcerpt:sentences[Number(f.sectionId.slice(1))%3]}))}
 }}
 const result=await new GeminiPedagogy({}, {client}).generateStudySummary({documentTitle:'Grand cours',kind:'summary',conciseOverview:true,sections})
 assert.equal(result.generation.mode,'gemini')
 assert.equal(result.generation.coverage.sectionsAnalyzed,24)
 assert.equal(result.generation.coverage.charactersAnalyzed,sections.reduce((n,s)=>n+s.content.length,0))
 assert.ok(calls.some(c=>c.fragments.some(f=>f.sectionId==='s23')))
 const overview=calls.find(c=>c.task==='summary-overview')
 assert.equal(overview.fragments.length,24)
 assert.equal(result.chapters.length,24)
 assert.equal(result.overview,sentences[0])
 assert.equal(result.generation.overviewGenerated,true)
 assert.equal(result.overviewProofs[0].sourceSectionId,'s0')
})
test('Une synthèse globale non sourcée ne remplace pas les chapitres validés',async()=>{
 const client={model:'gemini-test',async json({data}){return data.task==='summary-overview'?{points:[{text:'Fait inventé',sourceSectionId:'s0',sourceExcerpt:'une citation inexistante',category:'À retenir'}]}:{points:data.fragments.map(point)}}}
 const result=await new GeminiPedagogy({}, {client}).generateStudySummary({kind:'summary',conciseOverview:true,sections:[{id:'s0',title:'Métabolisme',content:sentences[0]}]})
 assert.ok(result.generation.overviewError)
 assert.equal(result.chapters[0].keyPoints[0],sentences[0])
 assert.ok(!result.overview.includes('inventé'))
})
test('Parcours Mes cours : appel Gemini réel du code, aperçu puis sauvegarde persistante, pas de résumé périmé après édition',async()=>{
 const {DatabaseSync}=await import('node:sqlite')
 const {initStudySchema}=await import('../server/study.mjs')
 const {handleStudySupports}=await import('../server/study/supports.mjs')
 const db=new DatabaseSync(':memory:')
 try{
  db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);INSERT INTO users VALUES('u');")
  initStudySchema(db)
  db.prepare("INSERT INTO study_documents(id,user_id,title,filename,file_size,created_at,updated_at) VALUES('d','u','Métabolisme','test.pdf',100,'now','now')").run()
  db.prepare('INSERT INTO study_sections VALUES(?,?,?,?,?,?,?,?,?)').run('s0','d','u','Glycolyse',0,1,1,sentences[0],10)
  const tasks=[]
  const client={model:'gemini-test',async json({data,onUsage}){tasks.push(data.task);onUsage?.({attempts:1,inputTokens:100,outputTokens:20,estimatedUsd:0,usageKnown:true});return {points:data.fragments.map(point)}}}
  const provider=new GeminiPedagogy({}, {client})
  const args={db,userId:'u',doc:{id:'d',title:'Métabolisme'},provider,config:{},localSummary:()=>{throw new Error('Unexpected local fallback')}}
  const preview=await handleStudySupports({...args,body:{action:'generate',task:'summary'}})
  assert.deepEqual(tasks,['summary','summary-overview'])
  assert.equal(preview.generation.mode,'gemini')
  assert.equal(preview.overview,sentences[0])
  const saved=await handleStudySupports({...args,body:{action:'save',previewId:preview.previewId,items:preview.items}})
  assert.equal(saved.summary.overview,preview.overview)
  assert.equal(JSON.parse(db.prepare('SELECT summary_json FROM study_summaries').get().summary_json).overview,preview.overview)
  const second=await handleStudySupports({...args,body:{action:'generate',task:'summary'}})
  const changed=await handleStudySupports({...args,body:{action:'save',previewId:second.previewId,items:second.items.map(i=>({...i,text:i.text+' Point relu.'}))}})
  assert.notEqual(changed.summary.overview,second.overview)
  assert.equal(changed.generation.overviewError,'OVERVIEW_INVALIDATED_BY_REVIEW')
 }finally{db.close()}
})
test('Le client HTTP Gemini est appelé pour analyse ET résumé global, avec le modèle configuré',async()=>{
 const calls=[]
 const provider=new GeminiPedagogy({GEMINI_API_KEY:'synthetic-key',GEMINI_MODEL:'gemini-test'}, {fetchImpl:async(url,options)=>{
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent')
  const data=JSON.parse(JSON.parse(options.body).contents[0].parts[0].text)
  calls.push(data.task)
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({points:data.fragments.map(point)})}]}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:20}})
 }})
 const summary=await provider.generateStudySummary({kind:'summary',conciseOverview:true,sections:[{id:'s0',title:'Glycolyse',content:sentences[0]}]})
 assert.deepEqual(calls,['summary','summary-overview'])
 assert.equal(summary.generation.model,'gemini-test')
 assert.equal(summary.generation.mode,'gemini')
 assert.equal(summary.overview,sentences[0])
 assert.ok(summary.generation.usage.inputTokens>=200)
})

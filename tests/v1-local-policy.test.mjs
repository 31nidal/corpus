import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {deflateSync} from 'node:zlib'
import {createApiHandler} from '../server/api.mjs'
import {TERMS_VERSION} from '../shared/legal.mjs'
import {transcribeMissingPages} from '../server/study/ocr-pages.mjs'
import {evaluateLocal} from '../scripts/evaluate-local-v1.mjs'
function pdf(text){const stream=deflateSync(Buffer.from('BT /F1 12 Tf 72 712 Td '+text.split(/(?<=\.) /).map(line=>'('+line+') Tj T*').join(' ')+' ET','latin1'));return Buffer.concat([Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`),stream,Buffer.from('\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF')])}
const source='Le nerf phrénique innerve le diaphragme. Le nerf vague innerve les muscles du pharynx. Le nerf hypoglosse innerve les muscles de la langue. Le nerf facial innerve les muscles de la mimique. Le nerf médian innerve le muscle pronateur rond.'
function harness(handler){return async(route,method='GET',body,cookie='',headers={})=>{
 const binary=Buffer.isBuffer(body),raw=body===undefined?'':binary?body:JSON.stringify(body),req=Readable.from(raw?[Buffer.from(raw)]:[])
 req.url=route;req.method=method;req.headers={cookie,'x-mycorpus-request':'1',...(method==='GET'?{}:{'content-type':binary?'application/pdf':'application/json'}),...headers};req.socket={remoteAddress:'127.0.0.1'}
 let status=200,output='',responseHeaders={}
 await handler(req,{writeHead(code,h={}){status=code;responseHeaders={...responseHeaders,...h}},setHeader(k,v){responseHeaders[k]=v},end(value=''){output+=value}})
 const cookies=responseHeaders['Set-Cookie']||[]
 return {status,data:output?JSON.parse(output):null,cookie:(Array.isArray(cookies)?cookies:[cookies]).map(s=>s.split(';')[0]).find(s=>s.startsWith('mycorpus_session='))}
}}
test('public V1 API makes zero generation network calls despite stale Gemini/HTTP/Ollama settings, OCR and regeneration requests',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'corpus-v1-local-')),original=globalThis.fetch;let networkCalls=0
 globalThis.fetch=async()=>{networkCalls++;throw new Error('network forbidden in this test')}
 try{
  const config={ACCOUNT_DATA_DIR:directory,GEMINI_API_KEY:'fake-test-key',GEMINI_MODEL:'invalid / model',AI_GENERATION_PROVIDER:'gemini',STUDY_AI_PROVIDER:'remote',CHAT_UPSTREAM_URL:'https://generativelanguage.googleapis.com/bridge',OLLAMA_BASE_URL:'https://external-ollama.invalid',RETENTION_POLICY_APPROVED:'1'}
  const call=harness(createApiHandler(config))
  assert.equal((await call('/api/status')).data.externalGeneration,false)
  const registered=await call('/api/account/register','POST',{name:'Locale',email:'local@example.test',password:'Local-policy-test-solide-2026',acceptTerms:true,termsVersion:TERMS_VERSION})
  assert.equal(registered.status,201);const cookie=registered.cookie
  assert.equal((await call('/api/chat','POST',{message:'Montre le coeur',body:'male',learning_level:'student'},cookie)).status,200)
  assert.equal((await call('/api/flashcards/generation-status','GET',undefined,cookie)).data.mode,'local')
  const up=await call('/api/study/documents/upload','POST',pdf('Chapitre 1 : Relations anatomiques. '+source),cookie,{'x-document-filename':'cours.pdf'})
  assert.equal(up.status,201);const id=up.data.document.id
  for(const action of ['summarize','questions']){
   const result=await call(`/api/study/documents/${id}/${action}`,'POST',action==='questions'?{count:5}:{},cookie)
   assert.ok(result.status<300,JSON.stringify(result.data))
  }
  const supports=await call(`/api/study/documents/${id}/supports`,'POST',{action:'generate',task:'questions',count:5},cookie)
  assert.equal(supports.status,200);assert.equal(supports.data.persisted,false)
  let receipt
  for(const [kind,body] of [['text',{text:source}],['study',{documentId:id}],['catalog',{courseId:'FMA7088',text:source,segments:[{id:'catalog-section',text:source}]}],['qcm-error',{qcm:{front:'Question test ?',back:source}}]]){
   const result=await call('/api/flashcards/generate/'+kind,'POST',body,cookie)
   assert.equal(result.status,200,kind+': '+JSON.stringify(result.data));assert.equal(result.data.generation.mode,'local');receipt=result.data.generationId
  }
  const regenerated=await call(`/api/flashcards/generations/${receipt}/regenerate`,'POST',{},cookie)
  assert.equal(regenerated.status,503)
  const drafts=await call(`/api/flashcards/documents/${id}/drafts/generate`,'POST',{count:5},cookie)
  assert.equal(drafts.status,201);assert.equal(drafts.data.generation.mode,'local')
  if(drafts.data.ids.length){const result=await call(`/api/flashcards/drafts/${drafts.data.ids[0]}/regenerate`,'POST',{},cookie);assert.equal(result.status,503)}
  const scanned=Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 30 >>\nstream\nq 10 0 0 10 50 50 cm /Im1 Do Q\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF')
  const scan=await call('/api/study/documents/upload','POST',scanned,cookie,{'x-document-filename':'scan.pdf','x-document-ocr':'1'})
  assert.equal(scan.status,422);assert.equal(scan.data.scanned,true)
  await assert.rejects(()=>transcribeMissingPages({extracted:{pages:[{pageNumber:1,text:source},{pageNumber:2,text:''}]},buffer:scanned,provider:null,config}),error=>error.code==='AI_OCR_UNAVAILABLE')
  const isolated=harness(createApiHandler({...config,STUDY_AI_PROVIDER:'ollama',ACCOUNT_DATA_DIR:path.join(directory,'other')}))
  assert.equal((await isolated('/api/status')).data.externalGeneration,false)
  assert.equal(networkCalls,0)
 }finally{globalThis.fetch=original;rmSync(directory,{recursive:true,force:true})}
})
test('local evaluation preserves excerpts and reports sparse output rather than promising a full generative replacement',()=>{
 const rows=evaluateLocal();assert.equal(rows.length,9)
 assert.ok(rows.every(row=>row.summaryExtractive&&row.cardsGrounded&&row.questionsGrounded))
 const structured=rows.find(row=>row.name==='Relations structurées');assert.equal(structured.questions,4);assert.equal(structured.cards,4)
 assert.ok(rows.filter(row=>row.name!=='Relations structurées').every(row=>row.questions===0))
 assert.equal(rows.find(row=>row.name==='Source insuffisante').cards,0)
 assert.equal(globalThis.intrusion,undefined)
})

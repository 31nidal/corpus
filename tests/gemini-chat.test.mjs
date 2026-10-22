import test from 'node:test'
import assert from 'node:assert/strict'
import {createChatProvider,createProvider} from '../server/providers.mjs'
import {GeminiChatProvider} from '../server/ai/chat.mjs'
const context={message:'Explique le cœur',body:'male',selected_structure:'FMA7088',structure_name:'Cœur',learning_level:'student',lesson:{source:'https://example.test/course'},allowed_actions:['focus_structure'],email:'private@example.test',password:'secret',document:'private PDF'}
test('Gemini branche le dialogue sans changer le fournisseur Study/HTTP',()=>{
 const config={GEMINI_API_KEY:'fictitious',CHAT_UPSTREAM_URL:'https://example.test/bridge'}
 assert.equal(createChatProvider(config).name,'gemini')
 assert.equal(createProvider(config).url,config.CHAT_UPSTREAM_URL)
 assert.equal(createChatProvider({...config,CHAT_AI_PROVIDER:'local'}),null)
 assert.equal(createChatProvider({...config,CHAT_AI_PROVIDER:'http'}).url,config.CHAT_UPSTREAM_URL)
 assert.equal(createChatProvider({}),null)
 assert.throws(()=>createChatProvider({CHAT_AI_PROVIDER:'typo'}))
})
test('Le contexte est minimisé et les sources proviennent du serveur',async()=>{
 let sent
 const p=new GeminiChatProvider({}, {client:{json:async request=>{sent=request;return {message:'Le cœur assure la circulation.',actions:[{action:'focus_structure',structure:'FMA7088'}],sources:[{url:'https://invented.test'}]}}}})
 const result=await p.respond(context)
 assert.equal(sent.data.message,context.message)
 for(const name of ['email','password','document'])assert.equal(name in sent.data,false)
 assert.match(sent.instruction,/diagnostic/)
 assert.deepEqual(result.sources,[{label:'Source du cours',url:context.lesson.source}])
 assert.equal(result.actions[0].structure,'FMA7088')
})
test('Réponses malformées refusées et erreur Gemini remontée sans repli caché',async()=>{
 for(const result of [null,{message:'',actions:[]},{message:'x'.repeat(16001),actions:[]},{message:'ok',actions:null},{message:'ok',actions:Array(9).fill({})}]){
  await assert.rejects(new GeminiChatProvider({}, {client:{json:async()=>result}}).respond(context),{code:'AI_INVALID_SCHEMA'})
 }
 await assert.rejects(new GeminiChatProvider({}, {client:{json:async()=>{throw new Error('simulated')}}}).respond(context),/simulated/)
})
test('API : Gemini répond, sources fiables et actions atlas filtrées, sans requête externe réelle',async()=>{
 const {createApiHandler}=await import('../server/api.mjs')
 const {Readable}=await import('node:stream')
 const original=globalThis.fetch
 let calls=0
 globalThis.fetch=async(url,options)=>{
  assert.match(String(url),/^https:\/\/generativelanguage.googleapis.com\//)
  const payload=JSON.parse(options.body)
  assert.equal(JSON.parse(payload.contents[0].parts[0].text).message,'Explique le cœur')
  calls++
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({message:'Le cœur propulse le sang.',actions:[{action:'isolate_structure',structure:'FMA7088'},{action:'focus_structure',structure:'invented'},{action:'run_code'}]})}]}}]})
 }
 try {
  const api=createApiHandler({GEMINI_API_KEY:'test-not-real'})
  const req=Readable.from([JSON.stringify({message:'Explique le cœur',body:'male',selected_structure:'FMA7088',learning_level:'student'})])
  Object.assign(req,{url:'/api/chat',method:'POST',headers:{'content-type':'application/json'}})
  let status,body
  await api(req,{writeHead(code){status=code},end(value){body=JSON.parse(value)}})
  assert.equal(status,200)
  assert.equal(body.provider,'gemini')
  assert.equal(body.mode,'connected')
  assert.deepEqual(body.actions,[{action:'isolate_structure',structure:'FMA7088'}])
  assert.equal(calls,1)
 } finally {globalThis.fetch=original}
})

import {expect,test} from '@playwright/test'
import http from 'node:http'
// @ts-expect-error Server modules execute in Node and have no browser declarations.
import {createApiHandler} from '../server/api.mjs'
const listen=(server:http.Server)=>new Promise<string>(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${(server.address() as any).port}`)))
const close=(server:http.Server)=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()))
test('adaptateur interchangeable : contexte transmis, actions invalides rejetées, erreur explicite',async()=>{
 let received:any,fail=false
 const provider=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;received=JSON.parse(body);res.writeHead(fail?503:200,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Réponse du fournisseur de test.',actions:[{action:'isolate_structure',structure:'FMA7088'},{action:'execute_code',code:'alert(1)'},{action:'focus_structure',structure:'INCONNU'}],sources:[]}))})
 const upstream=await listen(provider)
 const api=http.createServer(createApiHandler({CHAT_UPSTREAM_URL:upstream}));const url=await listen(api)
 try{
  const ask=()=>fetch(url+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Explique le cœur',selected_structure:'FMA7088',learning_level:'advanced',system:'FAUSSE MÉTADONNÉE'})})
  const result=await (await ask()).json()
  expect(result.mode).toBe('connected');expect(result.actions).toEqual([{action:'isolate_structure',structure:'FMA7088'}])
  expect(received.selected_structure).toBe('FMA7088');expect(received.system).not.toBe('FAUSSE MÉTADONNÉE');expect(received.lesson.id).toBe('FMA7088')
  fail=true;expect((await ask()).status).toBe(503)
 }finally{await close(api);await close(provider)}
})

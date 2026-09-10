import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {createAccountHandler} from '../server/accounts.mjs'

function harness(config){
 let handler=createAccountHandler(config)
 return {
  restart(){handler=createAccountHandler(config)},
  async call(route,body,cookie='',headers={}){
   const raw=body===undefined?'':JSON.stringify(body)
   const req=Readable.from(raw?[Buffer.from(raw)]:[])
   req.url='/api/account/'+route
   req.method=body===undefined?'GET':'POST'
   req.headers={...(body===undefined?{}:{'content-type':'application/json','x-mycorpus-request':'1'}),cookie,...headers}
   req.socket={remoteAddress:'127.0.0.1'}
   let status=200,responseHeaders={},output=''
   const res={
    setHeader(name,value){responseHeaders[name.toLowerCase()]=value},
    writeHead(code,nextHeaders){status=code;for(const [name,value] of Object.entries(nextHeaders||{}))responseHeaders[name.toLowerCase()]=value},
    end(value=''){output+=value},
   }
   await handler(req,res)
   return {status,data:JSON.parse(output),cookie:responseHeaders['set-cookie']?.split(';')[0]}
  },
 }
}

test('comptes : isolation, sécurité, persistance, fusion, récupération et suppression',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'mycorpus-test-')),api=harness({ACCOUNT_DATA_DIR:dir})
 const pw='un-long-mot-de-passe-2026'
 try{
  assert.equal((await api.call('session')).data.user,null)
  const alice=await api.call('register',{email:'alice@example.test',name:'Alice',password:pw})
  assert.equal(alice.status,201);assert.match(alice.cookie,/mycorpus_session=/);assert.ok(alice.data.recovery)
  const bob=await api.call('register',{email:'bob@example.test',name:'Bob',password:pw})
  assert.equal(bob.status,201)
  const operations=[
   {id:'note1',kind:'value',payload:{key:'corpus-note-FMA7088',value:'Note privée Alice',before:null}},
   {id:'course1',kind:'value',payload:{key:'corpus-completed',value:'["A"]',before:null}},
   {id:'chat1',kind:'chat',payload:{title:'Votre question · cœur',role:'user',text:'Explique le cœur.',context:'Le cœur'}},
   {id:'quiz1',kind:'quiz',payload:{title:'Examen blanc',score:1,total:1,questions:['heart-1'],answers:{'heart-1':[0]}}},
  ]
  assert.equal((await api.call('sync',{userId:alice.data.user.id,operations},alice.cookie)).status,200)
  await api.call('sync',{userId:alice.data.user.id,operations},alice.cookie)
  assert.equal((await api.call('history',undefined,alice.cookie)).data.items.length,4)
  assert.deepEqual((await api.call('session',undefined,bob.cookie)).data.state,{})
  assert.equal((await api.call('history')).status,401)
  assert.equal((await api.call('sync',{userId:alice.data.user.id,operations},bob.cookie)).status,409)
  assert.equal((await api.call('sync',{userId:alice.data.user.id,operations},alice.cookie,{origin:'https://evil.test'})).status,403)
  const invalid=[{id:'bad',kind:'value',payload:{key:'corpus-practice-v1',value:'invalid'}}]
  assert.equal((await api.call('sync',{userId:alice.data.user.id,operations:invalid},alice.cookie)).status,400)
  const merge=[{id:'course2',kind:'value',payload:{key:'corpus-completed',value:'["B"]',before:null}}]
  await api.call('sync',{userId:alice.data.user.id,operations:merge},alice.cookie)
  assert.deepEqual(JSON.parse((await api.call('session',undefined,alice.cookie)).data.state['corpus-completed']),['A','B'])
  api.restart()
  assert.equal((await api.call('session',undefined,alice.cookie)).data.state['corpus-note-FMA7088'],'Note privée Alice')
  assert.equal((await api.call('login',{email:'alice@example.test',password:pw+'bad'})).status,401)
  const reset=await api.call('recover',{email:'alice@example.test',password:pw+'new',recovery:alice.data.recovery})
  assert.equal(reset.status,200)
  assert.equal((await api.call('session',undefined,alice.cookie)).data.user,null)
  assert.equal((await api.call('recover',{email:'alice@example.test',password:pw,recovery:alice.data.recovery})).status,400)
  assert.equal((await api.call('export',undefined,reset.cookie)).data.history.length,5)
  assert.equal((await api.call('delete',{password:pw+'new'},reset.cookie)).status,200)
  assert.equal((await api.call('session',undefined,reset.cookie)).data.user,null)
  assert.equal((await api.call('session',undefined,bob.cookie)).data.user.name,'Bob')
 }finally{rmSync(dir,{recursive:true,force:true})}
})

test('Railway sans volume : comptes désactivés',async()=>{
 const api=harness({RAILWAY_ENVIRONMENT_ID:'production'})
 const response=await api.call('session')
 assert.equal(response.status,503)
 assert.equal(response.data.available,false)
})

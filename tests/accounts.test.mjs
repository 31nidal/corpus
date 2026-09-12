import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {DatabaseSync} from 'node:sqlite'
import {createAccountHandler} from '../server/accounts.mjs'

function harness(config,dependencies){
 let handler=createAccountHandler(config,dependencies)
 return {
  restart(){handler=createAccountHandler(config,dependencies)},
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
   const rawCookies=Array.isArray(responseHeaders['set-cookie'])?responseHeaders['set-cookie']:(responseHeaders['set-cookie']?[responseHeaders['set-cookie']]:[])
   const cookies=rawCookies.map(value=>value.split(';')[0])
   return {status,data:output?JSON.parse(output):null,cookies,cookie:cookies.find(value=>value.startsWith('mycorpus_session=')),location:responseHeaders.location}
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

test('Google : création, validation OAuth, mot de passe optionnel et suppression',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'mycorpus-google-'))
 const fakeGoogle={
  options:null,
  tokenRequest:null,
  profile:{sub:'google-subject-1',email:'camille@gmail.test',email_verified:true,name:'Camille Google'},
  generateAuthUrl(options){this.options=options;const url=new URL('https://accounts.google.test/o/oauth2/v2/auth');url.searchParams.set('state',options.state);return url.href},
  async getToken(options){this.tokenRequest=options;return {tokens:{id_token:'verified-id-token'}}},
  async verifyIdToken(){return {getPayload:()=>({...this.profile,nonce:this.options.nonce})}},
 }
 const api=harness({ACCOUNT_DATA_DIR:dir,APP_ORIGIN:'https://mycorpus3d.com',GOOGLE_CLIENT_ID:'client-id',GOOGLE_CLIENT_SECRET:'client-secret'},{makeGoogleClient:()=>fakeGoogle})
 try{
  const sessionBefore=await api.call('session')
  assert.equal(sessionBefore.data.google.available,true)
  const start=await api.call('google/start')
  assert.equal(start.status,302)
  assert.match(start.location,/^https:\/\/accounts\.google\.test\//)
  assert.deepEqual(fakeGoogle.options.scope,['openid','email','profile'])
  assert.equal(fakeGoogle.options.code_challenge_method,'S256')
  assert.ok(fakeGoogle.options.nonce)
  assert.ok(fakeGoogle.options.state)
  const oauthCookie=start.cookies.find(value=>value.startsWith('mycorpus_oauth_state='))
  const callback=await api.call(`google/callback?code=one-time-code&state=${encodeURIComponent(fakeGoogle.options.state)}`,undefined,oauthCookie)
  assert.equal(callback.status,302)
  assert.equal(new URL(callback.location).searchParams.get('resultat'),'connecte')
  assert.equal(fakeGoogle.tokenRequest.codeVerifier.length>=43,true)
  const googleSession=await api.call('session',undefined,callback.cookie)
  assert.equal(googleSession.data.user.email,'camille@gmail.test')
  assert.equal(googleSession.data.user.hasPassword,false)
  assert.equal(googleSession.data.user.googleLinked,true)
  const replay=await api.call(`google/callback?code=replay&state=${encodeURIComponent(fakeGoogle.options.state)}`,undefined,oauthCookie)
  assert.equal(new URL(replay.location).searchParams.get('detail'),'session')
  const password='mot-de-passe-ajoute-2026'
  const added=await api.call('password',{newPassword:password},callback.cookie)
  assert.equal(added.status,200)
  assert.ok(added.data.recovery)
  assert.equal(added.data.user.hasPassword,true)
  assert.equal((await api.call('login',{email:'camille@gmail.test',password})).status,200)
  assert.equal((await api.call('delete',{password},added.cookie)).status,200)
 }finally{rmSync(dir,{recursive:true,force:true})}
})

test('Google : une adresse locale exige une liaison depuis le compte connecté',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'mycorpus-google-link-'))
 const fakeGoogle={
  options:null,
  profile:{sub:'google-subject-link',email:'alice@example.test',email_verified:true,name:'Alice Google'},
  generateAuthUrl(options){this.options=options;return `https://accounts.google.test/auth?state=${encodeURIComponent(options.state)}`},
  async getToken(){return {tokens:{id_token:'verified-id-token'}}},
  async verifyIdToken(){return {getPayload:()=>({...this.profile,nonce:this.options.nonce})}},
 }
 const api=harness({ACCOUNT_DATA_DIR:dir,APP_ORIGIN:'https://mycorpus3d.com',GOOGLE_CLIENT_ID:'client-id',GOOGLE_CLIENT_SECRET:'client-secret'},{makeGoogleClient:()=>fakeGoogle})
 const password='un-long-mot-de-passe-2026'
 try{
  const alice=await api.call('register',{email:'alice@example.test',name:'Alice',password})
  const unsafeStart=await api.call('google/start')
  const unsafeOauth=unsafeStart.cookies.find(value=>value.startsWith('mycorpus_oauth_state='))
  const conflict=await api.call(`google/callback?code=code&state=${encodeURIComponent(fakeGoogle.options.state)}`,undefined,unsafeOauth)
  assert.equal(new URL(conflict.location).searchParams.get('detail'),'conflit')
  assert.equal((await api.call('session',undefined,alice.cookie)).data.user.googleLinked,false)
  const linkStart=await api.call('google/start?mode=link',undefined,alice.cookie)
  const linkOauth=linkStart.cookies.find(value=>value.startsWith('mycorpus_oauth_state='))
  const callbackCookies=[alice.cookie,linkOauth].join('; ')
  const linked=await api.call(`google/callback?code=code&state=${encodeURIComponent(fakeGoogle.options.state)}`,undefined,callbackCookies)
  assert.equal(new URL(linked.location).searchParams.get('resultat'),'lie')
  const linkedSession=await api.call('session',undefined,linked.cookie)
  assert.equal(linkedSession.data.user.googleLinked,true)
  assert.equal(linkedSession.data.user.id,alice.data.user.id)
  assert.equal((await api.call('delete',{password},linked.cookie)).status,200)
 }finally{rmSync(dir,{recursive:true,force:true})}
})

test('migration : une base de comptes existante reçoit les colonnes OAuth sans perte',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'mycorpus-migration-')),file=path.join(dir,'mycorpus.sqlite')
 try{
  const legacy=new DatabaseSync(file)
  legacy.exec('CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,recovery TEXT NOT NULL)')
  legacy.close()
  const api=harness({ACCOUNT_DATA_DIR:dir})
  assert.equal((await api.call('session')).status,200)
  const migrated=new DatabaseSync(file)
  assert.ok(migrated.prepare('PRAGMA table_info(users)').all().some(column=>column.name==='password_enabled'))
  assert.ok(migrated.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='identities'").get())
  migrated.close()
 }finally{rmSync(dir,{recursive:true,force:true})}
})

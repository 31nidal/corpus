import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {DatabaseSync} from 'node:sqlite'
import {createFeedbackHandler} from '../server/feedback.mjs'

function request(handler,body,headers={'x-mycorpus-request':'feedback'}){
 return new Promise(resolve=>{
  const req=Readable.from([JSON.stringify(body)]);req.method='POST';req.headers=headers;req.socket={remoteAddress:'127.0.0.1'}
  const response={status:0,headers:{},writeHead(status,responseHeaders){this.status=status;this.headers=responseHeaders},end(raw=''){resolve({status:this.status,body:raw?JSON.parse(raw):null})}}
  void handler(req,response)
 })
}

test('le formulaire enregistre un signalement anonyme validé',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'mycorpus-feedback-'))
 try{
  const handler=createFeedbackHandler({ACCOUNT_DATA_DIR:directory})
  const response=await request(handler,{course:'organelles',courseTitle:'La cellule',passage:'Passage à vérifier',correction:'Correction proposée',source:'https://example.org/reference',email:''})
  assert.equal(response.status,201);assert.equal(response.body.received,true)
  const db=new DatabaseSync(path.join(directory,'mycorpus.sqlite'),{readOnly:true})
  const report=db.prepare('SELECT course,passage,status FROM feedback_reports').get()
  assert.equal(report.course,'organelles');assert.equal(report.passage,'Passage à vérifier');assert.equal(report.status,'new');db.close()
 }finally{rmSync(directory,{recursive:true,force:true})}
})

test('le formulaire refuse une requête non marquée et une source non HTTPS',async()=>{
 const directory=mkdtempSync(path.join(tmpdir(),'mycorpus-feedback-'))
 try{
  const handler=createFeedbackHandler({ACCOUNT_DATA_DIR:directory})
  assert.equal((await request(handler,{},{})).status,403)
  const response=await request(handler,{course:'organelles',courseTitle:'La cellule',passage:'Passage',correction:'Correction',source:'javascript:alert(1)'})
  assert.equal(response.status,400)
 }finally{rmSync(directory,{recursive:true,force:true})}
})

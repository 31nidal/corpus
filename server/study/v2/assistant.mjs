import {randomUUID} from 'node:crypto'
import {generateWithQuota} from '../../ai/generation.mjs'
import {validateAssistantResponse} from '../../ai/document-assistant.mjs'
import {studyError,StudyLibrary} from './library.mjs'
import {selectNoteSources,sourceHash} from './note-sources.mjs'

export const MAX_ASSISTANT_THREADS=20
export const MAX_ASSISTANT_MESSAGES=50
export const MAX_ACTIVE_ASSISTANT_JOBS=2
export const MAX_QUEUED_ASSISTANT_JOBS=6
export const ASSISTANT_LEASE_MS=60000
const parse=JSON.parse
const publicColumns='id,thread_id,prompt,source_version,source_info_json,state,response_json,generation_json,error_code,error_message,created_at,updated_at'
const keys=(body,allowed)=>{if(Object.keys(body).some(key=>!allowed.includes(key)))throw studyError(400,'Paramètre d’assistant inconnu.')}
const validRequest=body=>{if(typeof body.requestId!=='string'||!body.requestId.trim()||body.requestId.length>100)throw studyError(400,'Identifiant de demande requis.')}
const noLocal=()=>{throw Object.assign(studyError(503,'L’assistant documentaire nécessite Gemini. Le cours et les supports restent disponibles.'),{code:'AI_REQUIRED'})}

export class DocumentAssistant {
  constructor({db,provider,config,now=Date.now}){
    Object.assign(this,{db,provider,config,now});this.library=new StudyLibrary(db,now)
    this.active=new Set();this.closed=false;this.timer=null;this.pump()
  }
  thread(userId,documentId,id){
    this.library.document(userId,documentId)
    const row=this.db.prepare('SELECT * FROM study_v2_assistant_threads WHERE id=? AND document_id=? AND user_id=?').get(id,documentId,userId)
    if(!row)throw studyError(404,'Conversation introuvable.')
    return {id:row.id,documentId:row.document_id,title:row.title,createdAt:row.created_at,updatedAt:row.updated_at}
  }
  serialize(row){
    return {id:row.id,threadId:row.thread_id,prompt:row.prompt,sourceVersion:row.source_version,source:parse(row.source_info_json),state:row.state,
      response:row.response_json?parse(row.response_json):null,generation:parse(row.generation_json),errorCode:row.error_code,errorMessage:row.error_message,createdAt:row.created_at,updatedAt:row.updated_at}
  }
  get(userId,documentId,id){
    const thread=this.thread(userId,documentId,id)
    const messages=this.db.prepare(`SELECT ${publicColumns} FROM study_v2_assistant_messages WHERE thread_id=? AND document_id=? AND user_id=? ORDER BY created_at,id`).all(id,documentId,userId).map(row=>this.serialize(row))
    return {...thread,messages}
  }
  list(userId,documentId){
    this.library.document(userId,documentId)
    return this.db.prepare('SELECT id FROM study_v2_assistant_threads WHERE document_id=? AND user_id=? ORDER BY updated_at DESC,id').all(documentId,userId).map(({id})=>this.thread(userId,documentId,id))
  }
  create(userId,documentId,body){
    const doc=this.library.document(userId,documentId)
    keys(body,['requestId','title']);validRequest(body)
    if(body.title!==undefined&&(typeof body.title!=='string'||!body.title.trim()||body.title.length>150))throw studyError(400,'Titre de conversation invalide.')
    const prior=this.db.prepare('SELECT id,document_id,title FROM study_v2_assistant_threads WHERE user_id=? AND request_id=?').get(userId,body.requestId)
    if(prior){if(prior.document_id!==documentId||body.title!==undefined&&body.title.trim()!==prior.title)throw studyError(409,'Cette demande correspond à une autre conversation.');return {thread:this.get(userId,documentId,prior.id),reused:true}}
    if(this.db.prepare('SELECT COUNT(*) AS n FROM study_v2_assistant_threads WHERE document_id=? AND user_id=?').get(documentId,userId).n>=MAX_ASSISTANT_THREADS)throw studyError(403,'Ce cours possède déjà 20 conversations. Supprimez une conversation avant d’en créer une.')
    const id=randomUUID(),now=this.now()
    this.db.prepare('INSERT INTO study_v2_assistant_threads VALUES(?,?,?,?,?,?,?)').run(id,documentId,userId,body.requestId,body.title?.trim()||doc.title.slice(0,150),now,now)
    return {thread:this.get(userId,documentId,id),reused:false}
  }
  ask(userId,documentId,threadId,body){
    this.thread(userId,documentId,threadId)
    keys(body,['requestId','prompt','sectionIds','selection']);validRequest(body)
    if(typeof body.prompt!=='string'||body.prompt.trim().length<3||body.prompt.length>2000)throw studyError(400,'La question doit contenir entre 3 et 2 000 caractères.')
    const hash=sourceHash({documentId,threadId,...body})
    const prior=this.db.prepare(`SELECT ${publicColumns},request_hash FROM study_v2_assistant_messages WHERE user_id=? AND request_id=?`).get(userId,body.requestId)
    if(prior){if(prior.request_hash!==hash)throw studyError(409,'Cette demande correspond à une autre question.');return {message:this.serialize(prior),reused:true}}
    if(this.db.prepare('SELECT COUNT(*) AS n FROM study_v2_assistant_messages WHERE thread_id=? AND user_id=?').get(threadId,userId).n>=MAX_ASSISTANT_MESSAGES)throw studyError(403,'Cette conversation possède 50 questions. Créez une nouvelle conversation.')
    if(this.db.prepare("SELECT 1 FROM study_v2_assistant_messages WHERE thread_id=? AND state IN ('queued','running')").get(threadId))throw studyError(409,'Attendez la réponse en cours avant de poser une autre question.')
    if(this.db.prepare("SELECT COUNT(*) AS n FROM study_v2_assistant_messages WHERE state IN ('queued','running')").get().n>=MAX_QUEUED_ASSISTANT_JOBS)throw studyError(429,'L’assistant est occupé. Réessayez dans un instant.')
    const doc=this.library.document(userId,documentId),scope=selectNoteSources(this.db,userId,doc,body)
    const history=this.db.prepare("SELECT prompt FROM study_v2_assistant_messages WHERE thread_id=? AND user_id=? AND state='succeeded' ORDER BY created_at DESC,id LIMIT 4").all(threadId,userId).reverse().map(({prompt})=>({prompt}))
    // Previous questions clarify references; previous generated claims never
    // become a new trusted source. The current scope is always read in the DB.
    const snapshot={...scope,history}
    const sourceInfo={sections:scope.sections.map(({id,title,startPage,endPage})=>({id,title,startPage,endPage})),selection:scope.selection,extraction:scope.extraction,processingState:scope.processingState}
    const id=randomUUID(),now=this.now()
    this.db.prepare('INSERT INTO study_v2_assistant_messages(id,thread_id,document_id,user_id,request_id,request_hash,prompt,source_version,scope_json,source_info_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,threadId,documentId,userId,body.requestId,hash,body.prompt.trim(),doc.version,JSON.stringify(snapshot),JSON.stringify(sourceInfo),now,now)
    this.db.prepare('UPDATE study_v2_assistant_threads SET updated_at=? WHERE id=? AND user_id=?').run(now,threadId,userId)
    queueMicrotask(()=>this.pump())
    return {message:this.get(userId,documentId,threadId).messages.find(message=>message.id===id),reused:false}
  }
  delete(userId,documentId,id){this.thread(userId,documentId,id);this.db.prepare('DELETE FROM study_v2_assistant_threads WHERE id=? AND user_id=?').run(id,userId)}
  pump(){
    if(this.closed)return
    this.db.prepare("UPDATE study_v2_assistant_messages SET state='interrupted',lease_until=NULL,lease_token=NULL,error_code='AI_INTERRUPTED',error_message='Réponse interrompue ; consommation IA incertaine. Posez de nouveau la question explicitement.',updated_at=? WHERE state='running' AND COALESCE(lease_until,0)<=?").run(this.now(),this.now())
    while(this.active.size<MAX_ACTIVE_ASSISTANT_JOBS){
      const row=this.db.prepare("SELECT * FROM study_v2_assistant_messages WHERE state='queued' ORDER BY created_at,id LIMIT 1").get()
      if(!row)break
      const token=randomUUID()
      if(!this.db.prepare("UPDATE study_v2_assistant_messages SET state='running',lease_token=?,lease_until=?,updated_at=? WHERE id=? AND state='queued'").run(token,this.now()+ASSISTANT_LEASE_MS,this.now(),row.id).changes)continue
      const task=this.answer({...row,lease_token:token}).finally(()=>{this.active.delete(task);queueMicrotask(()=>this.pump())})
      this.active.add(task)
    }
    clearTimeout(this.timer)
    if(this.db.prepare("SELECT 1 FROM study_v2_assistant_messages WHERE state='running'").get()){this.timer=setTimeout(()=>this.pump(),ASSISTANT_LEASE_MS);this.timer.unref?.()}
  }
  async answer(row){
    const heartbeat=setInterval(()=>this.db.prepare("UPDATE study_v2_assistant_messages SET lease_until=? WHERE id=? AND state='running' AND lease_token=?").run(this.now()+ASSISTANT_LEASE_MS,row.id,row.lease_token),ASSISTANT_LEASE_MS/3)
    heartbeat.unref?.();let result
    try{
      this.thread(row.user_id,row.document_id,row.thread_id)
      const scope=parse(row.scope_json)
      result=await generateWithQuota({db:this.db,userId:row.user_id,provider:this.provider?.name==='gemini'?this.provider:null,config:this.config,task:'document_assistant',context:{...scope,prompt:row.prompt},local:noLocal,allowLocalFallback:false})
      const response=validateAssistantResponse(result.value,scope)
      if(response.answered&&!result.value.verified)throw studyError(422,'Vérification de la réponse documentaire manquante.')
      this.db.prepare("UPDATE study_v2_assistant_messages SET state='succeeded',response_json=?,generation_json=?,lease_until=NULL,lease_token=NULL,updated_at=? WHERE id=? AND state='running' AND lease_token=?").run(JSON.stringify(response),JSON.stringify(result.generation),this.now(),row.id,row.lease_token)
    }catch(error){
      result?.refund?.()
      this.db.prepare("UPDATE study_v2_assistant_messages SET state='failed',error_code=?,error_message=?,generation_json=?,lease_until=NULL,lease_token=NULL,updated_at=? WHERE id=? AND state='running' AND lease_token=?").run(error.code||'ASSISTANT_FAILED',error.message||'Réponse impossible.',JSON.stringify(error.generation||{}),this.now(),row.id,row.lease_token)
    }finally{clearInterval(heartbeat)}
  }
  async drain(){this.pump();while(this.active.size)await Promise.all([...this.active])}
  async close(){this.closed=true;clearTimeout(this.timer);await Promise.all([...this.active])}
}

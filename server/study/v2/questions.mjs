import {randomUUID} from 'node:crypto'
import {generateWithQuota} from '../../ai/generation.mjs'
import {studyError,StudyLibrary} from './library.mjs'
import {selectNoteSources,sourceHash,canonicalSource} from './note-sources.mjs'
import {questionSettings,validateQuestion,verificationResult} from './question-validation.mjs'

export const MAX_QUESTION_SETS_PER_DOCUMENT=30
export const MAX_ACTIVE_QUESTION_JOBS=2
export const MAX_QUEUED_QUESTION_JOBS=6
export const QUESTION_LEASE_MS=60000
const parse=JSON.parse
const keys=(body,allowed)=>{if(Object.keys(body).some(key=>!allowed.includes(key)))throw studyError(400,'Paramètre QCM inconnu.')}
const noLocal=()=>{throw Object.assign(studyError(503,'La génération de QCM avec vérification nécessite Gemini. Vos séries existantes restent disponibles.'),{code:'AI_REQUIRED'})}

export class StudyQuestions {
  constructor({db,provider,config,now=Date.now}){
    Object.assign(this,{db,provider,config,now})
    this.library=new StudyLibrary(db,now)
    this.active=new Set();this.closed=false;this.timer=null;this.pump()
  }
  row(userId,documentId,id){
    this.library.document(userId,documentId)
    const row=this.db.prepare('SELECT * FROM study_v2_question_sets WHERE id=? AND document_id=? AND user_id=?').get(id,documentId,userId)
    if(!row)throw studyError(404,'Série QCM introuvable.')
    return row
  }
  questionRow(userId,documentId,setId,id){
    this.row(userId,documentId,setId)
    const row=this.db.prepare('SELECT * FROM study_v2_questions WHERE id=? AND set_id=? AND document_id=? AND user_id=?').get(id,setId,documentId,userId)
    if(!row)throw studyError(404,'Question introuvable.')
    return row
  }
  serializeQuestion(row){return {...parse(row.content_json),id:row.id,status:row.status,version:row.version,validation:parse(row.validation_json)}}
  job(userId,documentId,id){
    this.library.document(userId,documentId)
    const row=this.db.prepare('SELECT * FROM study_v2_question_jobs WHERE id=? AND document_id=? AND user_id=?').get(id,documentId,userId)
    if(!row)throw studyError(404,'Génération QCM introuvable.')
    return {id:row.id,setId:row.set_id,targetQuestionId:row.target_question_id,state:row.state,result:parse(row.result_json),errorCode:row.error_code,errorMessage:row.error_message}
  }
  get(userId,documentId,id){
    const row=this.row(userId,documentId,id),scope=parse(row.scope_json)
    const jobs=this.db.prepare('SELECT id FROM study_v2_question_jobs WHERE set_id=? AND user_id=? ORDER BY created_at DESC,id LIMIT 10').all(id,userId)
    return {id,title:row.title,documentId,sourceVersion:row.source_version,settings:parse(row.settings_json),
      sections:scope.sections.map(({id,title,startPage,endPage})=>({id,title,startPage,endPage})),extraction:scope.extraction,sourceState:scope.processingState,
      questions:this.db.prepare('SELECT * FROM study_v2_questions WHERE set_id=? AND user_id=? ORDER BY created_at,id').all(id,userId).map(row=>this.serializeQuestion(row)),
      jobs:jobs.map(job=>this.job(userId,documentId,job.id)),createdAt:row.created_at,updatedAt:row.updated_at}
  }
  list(userId,documentId){
    this.library.document(userId,documentId)
    return this.db.prepare('SELECT id FROM study_v2_question_sets WHERE document_id=? AND user_id=? ORDER BY created_at DESC,id').all(documentId,userId).map(({id})=>{
      const {questions,...set}=this.get(userId,documentId,id)
      return {...set,count:questions.length,validated:questions.filter(question=>question.status==='validated').length}
    })
  }
  requestId(body){if(typeof body.requestId!=='string'||!body.requestId.trim()||body.requestId.length>100)throw studyError(400,'Identifiant de demande QCM requis.')}
  reusable(userId,documentId,body,hash){
    const prior=this.db.prepare('SELECT * FROM study_v2_question_jobs WHERE user_id=? AND request_id=?').get(userId,body.requestId)
    if(!prior)return null
    if(prior.request_hash!==hash||prior.document_id!==documentId)throw studyError(409,'Cette demande correspond à une autre génération QCM.')
    return {set:this.get(userId,documentId,prior.set_id),job:this.job(userId,documentId,prior.id),reused:true}
  }
  checkQueue(){
    if(this.db.prepare("SELECT COUNT(*) AS n FROM study_v2_question_jobs WHERE state IN ('queued','running')").get().n>=MAX_QUEUED_QUESTION_JOBS)throw studyError(429,'Les générations QCM sont occupées. Réessayez dans un instant.')
  }
  insertJob(userId,documentId,setId,body,hash,target=null){
    const id=randomUUID(),now=this.now()
    this.db.prepare('INSERT INTO study_v2_question_jobs(id,set_id,document_id,user_id,request_id,request_hash,target_question_id,target_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,setId,documentId,userId,body.requestId,hash,target?.id??null,target?.version??null,now,now)
    queueMicrotask(()=>this.pump())
    return {set:this.get(userId,documentId,setId),job:this.job(userId,documentId,id),reused:false}
  }
  create(userId,documentId,body){
    const doc=this.library.document(userId,documentId)
    keys(body,['requestId','title','count','format','difficulty','kind','sectionIds','selection'])
    this.requestId(body)
    const settings=questionSettings(body),hash=sourceHash({documentId,...body})
    const reused=this.reusable(userId,documentId,body,hash)
    if(reused)return reused
    if(this.db.prepare('SELECT COUNT(*) AS n FROM study_v2_question_sets WHERE document_id=? AND user_id=?').get(documentId,userId).n>=MAX_QUESTION_SETS_PER_DOCUMENT)throw studyError(403,'Ce document possède déjà 30 séries QCM.')
    this.checkQueue()
    const scope=selectNoteSources(this.db,userId,doc,body),id=randomUUID(),now=this.now()
    const title=body.title??`QCM — ${doc.title}`.slice(0,150)
    if(typeof title!=='string'||!title.trim()||title.length>150)throw studyError(400,'Titre de série invalide.')
    this.db.exec('BEGIN IMMEDIATE')
    try{
      this.db.prepare('INSERT INTO study_v2_question_sets VALUES(?,?,?,?,?,?,?,?,?)').run(id,documentId,userId,title.trim(),doc.version,JSON.stringify(scope),JSON.stringify(settings),now,now)
      const result=this.insertJob(userId,documentId,id,body,hash)
      this.db.exec('COMMIT');return result
    }catch(error){this.db.exec('ROLLBACK');throw error}
  }
  patch(userId,documentId,setId,id,body){
    const set=this.row(userId,documentId,setId),row=this.questionRow(userId,documentId,setId,id)
    keys(body,['expectedVersion','content','status','reviewConfirmed'])
    if(!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion!==row.version)throw studyError(409,'La question a changé. Rechargez avant de modifier.')
    if(body.status!==undefined&&!['draft','validated','rejected'].includes(body.status))throw studyError(400,'Statut QCM invalide.')
    const content=body.content===undefined?parse(row.content_json):validateQuestion(body.content,parse(set.scope_json),parse(set.settings_json))
    const validation=body.content===undefined?parse(row.validation_json):{passed:false,edited:true,message:'Question modifiée : vérification IA précédente invalidée.'}
    const status=body.status??(body.content!==undefined?'draft':row.status)
    if(status==='validated'){
      if(body.reviewConfirmed!==true)throw studyError(400,'Confirmez la relecture des propositions et de leurs sources.')
      Object.assign(validation,{humanReviewed:true,reviewedAt:this.now()})
    }
    const updated=this.db.prepare('UPDATE study_v2_questions SET content_json=?,status=?,validation_json=?,version=version+1,updated_at=? WHERE id=? AND user_id=? AND version=?').run(JSON.stringify(content),status,JSON.stringify(validation),this.now(),id,userId,row.version)
    if(!updated.changes)throw studyError(409,'La question a changé. Rechargez avant de modifier.')
    return this.serializeQuestion(this.questionRow(userId,documentId,setId,id))
  }
  regenerate(userId,documentId,setId,id,body){
    const target=this.questionRow(userId,documentId,setId,id)
    keys(body,['requestId','expectedVersion']);this.requestId(body)
    const hash=sourceHash({documentId,setId,id,...body}),reused=this.reusable(userId,documentId,body,hash)
    if(reused)return reused
    if(body.expectedVersion!==target.version)throw studyError(409,'La question a changé. Rechargez avant de régénérer.')
    if(this.db.prepare("SELECT 1 FROM study_v2_question_jobs WHERE target_question_id=? AND state IN ('queued','running')").get(id))throw studyError(409,'Cette question est déjà en cours de régénération.')
    this.checkQueue()
    return this.insertJob(userId,documentId,setId,body,hash,target)
  }
  delete(userId,documentId,id){this.row(userId,documentId,id);this.db.prepare('DELETE FROM study_v2_question_sets WHERE id=? AND user_id=?').run(id,userId)}
  pump(){
    if(this.closed)return
    this.db.prepare("UPDATE study_v2_question_jobs SET state='interrupted',lease_token=NULL,lease_until=NULL,error_code='AI_INTERRUPTED',error_message='Génération interrompue. Relance explicite requise ; consommation IA incertaine.',updated_at=? WHERE state='running' AND COALESCE(lease_until,0)<=?").run(this.now(),this.now())
    while(this.active.size<MAX_ACTIVE_QUESTION_JOBS){
      const row=this.db.prepare("SELECT * FROM study_v2_question_jobs WHERE state='queued' ORDER BY created_at,id LIMIT 1").get()
      if(!row)break
      const token=randomUUID()
      if(!this.db.prepare("UPDATE study_v2_question_jobs SET state='running',lease_token=?,lease_until=?,updated_at=? WHERE id=? AND state='queued'").run(token,this.now()+QUESTION_LEASE_MS,this.now(),row.id).changes)continue
      const task=this.generate({...row,lease_token:token}).finally(()=>{this.active.delete(task);queueMicrotask(()=>this.pump())})
      this.active.add(task)
    }
    clearTimeout(this.timer)
    if(this.db.prepare("SELECT 1 FROM study_v2_question_jobs WHERE state='running'").get()){this.timer=setTimeout(()=>this.pump(),QUESTION_LEASE_MS);this.timer.unref?.()}
  }
  async generate(row){
    const heartbeat=setInterval(()=>this.db.prepare("UPDATE study_v2_question_jobs SET lease_until=? WHERE id=? AND state='running' AND lease_token=?").run(this.now()+QUESTION_LEASE_MS,row.id,row.lease_token),QUESTION_LEASE_MS/3)
    heartbeat.unref?.();let result
    try{
      const set=this.row(row.user_id,row.document_id,row.set_id),scope=parse(set.scope_json),settings=parse(set.settings_json)
      const target=row.target_question_id?this.questionRow(row.user_id,row.document_id,row.set_id,row.target_question_id):null
      if(target&&target.version!==row.target_version)throw studyError(409,'La question a été modifiée ; régénération annulée.')
      const context={sections:scope.sections,settings:{...settings,count:target?1:settings.count},previousQuestion:target?parse(target.content_json):null}
      result=await generateWithQuota({db:this.db,userId:row.user_id,provider:this.provider?.name==='gemini'?this.provider:null,config:this.config,task:'study_questions',context,local:noLocal,allowLocalFallback:false})
      if(!Array.isArray(result.value.questions)||result.value.questions.length>settings.count)throw studyError(422,'Format de QCM invalide.')
      const valid=[],seen=new Set()
      for(const candidate of result.value.questions){
        const content=validateQuestion(candidate,scope,settings),verification=candidate.verification
        if(verification?.passed!==true)throw studyError(422,'Vérification indépendante du QCM manquante.')
        const checked=verificationResult({coherent:true,reason:verification.reason,options:verification.options},content)
        if(!checked.passed)throw studyError(422,'Vérification indépendante du QCM incohérente.')
        const key=canonicalSource(content.prompt).toLocaleLowerCase('fr')
        if(!seen.has(key)){seen.add(key);valid.push({content,verification:checked})}
      }
      if(!valid.length)throw studyError(422,'Aucun QCM suffisamment étayé.')
      this.db.exec('BEGIN IMMEDIATE')
      try{
        const owned=this.db.prepare("SELECT 1 FROM study_v2_question_jobs WHERE id=? AND state='running' AND lease_token=?").get(row.id,row.lease_token)
        if(!owned){this.db.exec('ROLLBACK');return}
        const now=this.now()
        if(target){
          const changed=this.db.prepare("UPDATE study_v2_questions SET content_json=?,validation_json=?,status='draft',version=version+1,updated_at=? WHERE id=? AND user_id=? AND version=?").run(JSON.stringify(valid[0].content),JSON.stringify(valid[0].verification),now,target.id,row.user_id,row.target_version)
          if(!changed.changes)throw studyError(409,'Question modifiée pendant la génération. Vos modifications sont conservées.')
        }else{
          for(const {content,verification}of valid)this.db.prepare('INSERT INTO study_v2_questions(id,set_id,document_id,user_id,content_json,validation_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),row.set_id,row.document_id,row.user_id,JSON.stringify(content),JSON.stringify(verification),now,now)
        }
        const missingSections=scope.sections.filter(section=>!valid.some(({content})=>content.options.some(option=>option.sourceSectionId===section.id))).map(({id,title})=>({id,title}))
        const coverage={sectionsTotal:scope.sections.length,sectionsRepresented:scope.sections.length-missingSections.length,missingSections}
        this.db.prepare("UPDATE study_v2_question_jobs SET state='succeeded',lease_token=NULL,lease_until=NULL,result_json=?,updated_at=? WHERE id=?").run(JSON.stringify({generation:result.generation,created:target?0:valid.length,replaced:target?1:0,requested:target?1:settings.count,coverage}),now,row.id)
        this.db.exec('COMMIT')
      }catch(error){this.db.exec('ROLLBACK');throw error}
    }catch(error){
      result?.refund?.()
      this.db.prepare("UPDATE study_v2_question_jobs SET state='failed',lease_token=NULL,lease_until=NULL,error_code=?,error_message=?,result_json=?,updated_at=? WHERE id=? AND state='running' AND lease_token=?").run(error.code||'QCM_GENERATION_FAILED',error.message||'Génération QCM impossible.',JSON.stringify({generation:error.generation||{}}),this.now(),row.id,row.lease_token)
    }finally{clearInterval(heartbeat)}
  }
  async drain(){this.pump();while(this.active.size)await Promise.all([...this.active])}
  async close(){this.closed=true;clearTimeout(this.timer);await Promise.all([...this.active])}
}

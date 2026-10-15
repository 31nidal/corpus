import {randomUUID} from 'node:crypto'
import {studyError,StudyLibrary} from './library.mjs'

export const MAX_TRAINING_QUESTIONS=30
const parse=JSON.parse
const same=(left,right)=>left.length===right.length&&left.every((value,index)=>value===right[index])

export class QuestionTraining {
  constructor({db,questions,now=Date.now}){Object.assign(this,{db,questions,now});this.library=new StudyLibrary(db,now)}
  row(userId,documentId,id){
    this.library.document(userId,documentId)
    const row=this.db.prepare('SELECT * FROM study_v2_training_attempts WHERE id=? AND document_id=? AND user_id=?').get(id,documentId,userId)
    if(!row)throw studyError(404,'Entraînement introuvable.')
    return row
  }
  serialize(row){
    const answers=parse(row.answers_json),snapshot=parse(row.snapshot_json)
    let score=0
    const questions=snapshot.map(question=>{
      const answer=answers[question.id],correct=question.options.flatMap((option,index)=>option.correct?[index]:[])
      const isCorrect=answer!==undefined&&same(answer,correct)
      if(isCorrect)score++
      const showCorrection=Boolean(row.finished_at)||row.mode==='immediate'&&answer!==undefined
      return {id:question.id,prompt:question.prompt,format:question.format,answer:answer??null,
        options:question.options.map(option=>showCorrection?option:{text:option.text}),
        ...(showCorrection?{isCorrect,correct}: {})}
    })
    return {id:row.id,setId:row.set_id,documentId:row.document_id,mode:row.mode,questions,
      answered:Object.keys(answers).length,total:snapshot.length,finishedAt:row.finished_at,
      score:row.finished_at?score:null,createdAt:row.created_at}
  }
  get(userId,documentId,id){return this.serialize(this.row(userId,documentId,id))}
  list(userId,documentId){
    this.library.document(userId,documentId)
    return this.db.prepare('SELECT * FROM study_v2_training_attempts WHERE document_id=? AND user_id=? ORDER BY created_at DESC LIMIT 100').all(documentId,userId).map(row=>{
      const {questions,...header}=this.serialize(row)
      return header
    })
  }
  create(userId,documentId,setId,body){
    const set=this.questions.get(userId,documentId,setId)
    if(Object.keys(body).some(key=>!['requestId','mode','questionIds'].includes(key))||typeof body.requestId!=='string'||!body.requestId.trim()||body.requestId.length>100||!['immediate','deferred'].includes(body.mode))throw studyError(400,'Paramètres d’entraînement invalides.')
    const old=this.db.prepare('SELECT * FROM study_v2_training_attempts WHERE user_id=? AND request_id=?').get(userId,body.requestId)
    if(old){
      const priorIds=parse(old.snapshot_json).map(question=>question.id)
      if(old.set_id!==setId||old.mode!==body.mode||body.questionIds!==undefined&&JSON.stringify(body.questionIds)!==JSON.stringify(priorIds))throw studyError(409,'Cette demande correspond à un autre entraînement.')
      return this.serialize(old)
    }
    let selected=set.questions.filter(question=>question.status==='validated')
    if(body.questionIds!==undefined){
      if(!Array.isArray(body.questionIds)||!body.questionIds.length||body.questionIds.length>MAX_TRAINING_QUESTIONS||new Set(body.questionIds).size!==body.questionIds.length||body.questionIds.some(id=>typeof id!=='string'||!selected.some(question=>question.id===id)))throw studyError(400,'Choisissez uniquement des questions validées de cette série.')
      selected=body.questionIds.map(id=>selected.find(question=>question.id===id))
    }
    if(!selected.length||selected.length>MAX_TRAINING_QUESTIONS)throw studyError(409,'Validez des questions avant de commencer l’entraînement.')
    const id=randomUUID(),now=this.now()
    this.db.prepare('INSERT INTO study_v2_training_attempts(id,set_id,document_id,user_id,request_id,mode,snapshot_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,setId,documentId,userId,body.requestId,body.mode,JSON.stringify(selected),now,now)
    return this.get(userId,documentId,id)
  }
  answer(userId,documentId,id,body){
    const row=this.row(userId,documentId,id)
    if(Object.keys(body).some(key=>!['questionId','selected'].includes(key)))throw studyError(400,'Paramètre de réponse inconnu.')
    const question=parse(row.snapshot_json).find(question=>question.id===body.questionId)
    if(!question||!Array.isArray(body.selected)||!body.selected.length||new Set(body.selected).size!==body.selected.length||body.selected.some(index=>!Number.isSafeInteger(index)||index<0||index>=question.options.length)||question.format==='single'&&body.selected.length!==1)throw studyError(400,'Réponse invalide.')
    const selected=[...body.selected].sort((a,b)=>a-b),answers=parse(row.answers_json)
    if(answers[question.id]){
      if(!same(answers[question.id],selected))throw studyError(409,'Cette réponse est déjà enregistrée.')
      return this.serialize(row)
    }
    if(row.finished_at)throw studyError(409,'Cet entraînement est terminé.')
    answers[question.id]=selected
    this.db.prepare('UPDATE study_v2_training_attempts SET answers_json=?,updated_at=? WHERE id=? AND user_id=?').run(JSON.stringify(answers),this.now(),id,userId)
    return this.get(userId,documentId,id)
  }
  finish(userId,documentId,id){
    const row=this.row(userId,documentId,id)
    if(!row.finished_at)this.db.prepare('UPDATE study_v2_training_attempts SET finished_at=?,updated_at=? WHERE id=? AND user_id=?').run(this.now(),this.now(),id,userId)
    return this.get(userId,documentId,id)
  }
}

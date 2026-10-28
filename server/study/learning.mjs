import {normalize} from '../flashcards/generation.mjs'

const fail=(status,message)=>Object.assign(new Error(message),{status})
export function initLearningSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS study_learning_documents(
 document_id TEXT PRIMARY KEY REFERENCES study_documents(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 subject TEXT NOT NULL DEFAULT '',last_opened_at TEXT);
 CREATE TABLE IF NOT EXISTS study_learning_attempts(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 document_id TEXT NOT NULL REFERENCES study_documents(id) ON DELETE CASCADE,
 question_id TEXT NOT NULL,
 section_id TEXT,answers_json TEXT NOT NULL,correct INTEGER NOT NULL,created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS study_attempts_owner ON study_learning_attempts(user_id,document_id,created_at);`)
}
export function questionEvidence(db,userId,documentId,question){
 const excerpt=question.sourceExcerpt
 if(typeof excerpt!=='string'||normalize(excerpt).length<15)return {verified:false,page:null}
 const section=db.prepare('SELECT content FROM study_sections WHERE id=? AND document_id=? AND user_id=?').get(question.sourceSectionId,documentId,userId)
 if(!section||!normalize(section.content).includes(normalize(excerpt)))return {verified:false,page:null}
 const pages=db.prepare('SELECT page_number,text FROM study_pdf_pages WHERE document_id=? AND user_id=? ORDER BY page_number').all(documentId,userId)
 const page=pages.find(p=>normalize(p.text).includes(normalize(excerpt)))?.page_number??null
 return {verified:true,page}
}
export function learningOverview(db,userId){
 initLearningSchema(db)
 const metadata=db.prepare('SELECT document_id AS documentId,subject,last_opened_at AS lastOpenedAt FROM study_learning_documents WHERE user_id=?').all(userId)
 const questions=db.prepare(`SELECT q.id,q.document_id AS documentId,q.section_id AS sectionId,s.title AS sectionTitle
 FROM study_questions q LEFT JOIN study_sections s ON s.id=q.section_id AND s.user_id=q.user_id WHERE q.user_id=?`).all(userId)
 const history=db.prepare(`SELECT id,document_id AS documentId,question_id AS questionId,section_id AS sectionId,correct,created_at AS createdAt
 FROM study_learning_attempts WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 100`).all(userId)
 return {metadata,questions,history}
}
export function updateLearningDocument(db,userId,documentId,body){
 initLearningSchema(db)
 if(!db.prepare('SELECT id FROM study_documents WHERE id=? AND user_id=?').get(documentId,userId))throw fail(404,'Cours introuvable.')
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['subject','opened'].includes(k))||body.subject!==undefined&&(typeof body.subject!=='string'||body.subject.trim().length>100)||body.opened!==undefined&&body.opened!==true)throw fail(400,'Organisation du cours invalide.')
 db.prepare('INSERT OR IGNORE INTO study_learning_documents(document_id,user_id) VALUES(?,?)').run(documentId,userId)
 if(body.subject!==undefined)db.prepare('UPDATE study_learning_documents SET subject=? WHERE document_id=? AND user_id=?').run(body.subject.trim(),documentId,userId)
 if(body.opened)db.prepare('UPDATE study_learning_documents SET last_opened_at=? WHERE document_id=? AND user_id=?').run(new Date().toISOString(),documentId,userId)
 return {ok:true}
}
export function saveLearningAttempt(db,userId,documentId,body){
 initLearningSchema(db)
 if(!db.prepare('SELECT id FROM study_documents WHERE id=? AND user_id=?').get(documentId,userId))throw fail(404,'Cours introuvable.')
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['id','questionId','answers'].includes(k))||typeof body.id!=='string'||!/^[-a-zA-Z0-9_]{10,80}$/.test(body.id)||typeof body.questionId!=='string'||!Array.isArray(body.answers)||!body.answers.length||body.answers.length>10||new Set(body.answers).size!==body.answers.length)throw fail(400,'Réponse invalide.')
 const q=db.prepare(`SELECT id,section_id AS sourceSectionId,source_excerpt AS sourceExcerpt,options_json,correct_json FROM study_questions WHERE id=? AND document_id=? AND user_id=?`).get(body.questionId,documentId,userId)
 if(!q)throw fail(404,'Question introuvable.')
 if(!questionEvidence(db,userId,documentId,q).verified)throw fail(422,'La source de cette question ne peut pas être vérifiée. Aucune réponse enregistrée.')
 const options=JSON.parse(q.options_json),correct=JSON.parse(q.correct_json)
 if(body.answers.some(i=>!Number.isInteger(i)||i<0||i>=options.length))throw fail(400,'Proposition invalide.')
 const answers=[...body.answers].sort((a,b)=>a-b),ok=answers.length===correct.length&&correct.every(i=>answers.includes(i))
 const previous=db.prepare('SELECT * FROM study_learning_attempts WHERE id=?').get(body.id)
 if(previous){
  if(previous.user_id!==userId||previous.document_id!==documentId||previous.question_id!==q.id||previous.answers_json!==JSON.stringify(answers))throw fail(409,'Identifiant de réponse déjà utilisé.')
  return {id:previous.id,correct:!!previous.correct,createdAt:previous.created_at}
 }
 const now=new Date().toISOString()
 db.prepare('INSERT INTO study_learning_attempts VALUES(?,?,?,?,?,?,?,?)').run(body.id,userId,documentId,q.id,q.sourceSectionId,JSON.stringify(answers),Number(ok),now)
 return {id:body.id,correct:ok,createdAt:now}
}

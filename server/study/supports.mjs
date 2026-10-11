import {randomUUID,createHash} from 'node:crypto'
import {generateWithQuota} from '../ai/generation.mjs'
import {normalize} from '../flashcards/generation.mjs'
import {sourcePage} from './source-page.mjs'

const fail=(status,message)=>Object.assign(new Error(message),{status})
const fingerprint=sections=>createHash('sha256').update(JSON.stringify(sections.map(s=>[s.id,s.content]))).digest('hex')
export function initSupportSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS study_generation_previews(
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES study_documents(id) ON DELETE CASCADE,
    task TEXT NOT NULL,payload_json TEXT NOT NULL,source_hash TEXT NOT NULL,
    saved_json TEXT,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL
  );CREATE INDEX IF NOT EXISTS study_preview_user ON study_generation_previews(user_id,document_id);`)
}
const toRows=(value,task,sections)=>{
  if(task==='questions')return value.map(q=>({id:randomUUID(),sectionId:q.sourceSectionId,text:q.prompt,options:q.options,correct:q.correct,why:q.why,sourceExcerpt:q.sourceExcerpt}))
  return value.chapters.flatMap(chapter=>{
    const section=sections.find(s=>s.id===chapter.id)||sections.find(s=>s.title===chapter.title)
    if(!section)return []
    if(chapter.proofs?.length)return chapter.proofs.map(point=>({id:randomUUID(),sectionId:section.id,text:point.text,sourceExcerpt:point.sourceExcerpt,category:point.category||''}))
    return (chapter.keyPoints||[]).filter(text=>normalize(section.content).includes(normalize(text))).map(text=>({id:randomUUID(),sectionId:section.id,text,sourceExcerpt:text,category:''}))
  })
}
export async function handleStudySupports({db,userId,doc,body,provider,config,localSummary,localQuestions}) {
  initSupportSchema(db)
  const sections=db.prepare('SELECT id,title,content,start_page AS startPage,end_page AS endPage FROM study_sections WHERE document_id=? AND user_id=? ORDER BY section_order').all(doc.id,userId)
  if(body.action==='save') {
    const preview=typeof body.previewId==='string'&&db.prepare('SELECT * FROM study_generation_previews WHERE id=? AND user_id=? AND document_id=?').get(body.previewId,userId,doc.id)
    if(!preview)throw fail(404,'Prévisualisation introuvable.')
    if(preview.saved_json)return JSON.parse(preview.saved_json)
    if(preview.expires_at<Date.now())throw fail(409,'Cette prévisualisation a expiré. Régénérez le support.')
    if(preview.source_hash!==fingerprint(sections))throw fail(409,'Le cours a changé. Régénérez le support.')
    const original=JSON.parse(preview.payload_json)
    if(!Array.isArray(body.items)||body.items.length<1||body.items.length>500||new Set(body.items.map(i=>i?.id)).size!==body.items.length)throw fail(400,'Sélection de supports invalide.')
    const items=body.items.map(item=>{
      const source=original.items.find(i=>i.id===item.id)
      if(!source||typeof item.text!=='string'||!item.text.trim()||item.text.length>2000)throw fail(400,'Contenu de support invalide.')
      const result={...source,text:item.text.trim(),edited:item.text!==source.text}
      if(preview.task==='questions') {
        if(!Array.isArray(item.options)||item.options.length<3||item.options.length>5||item.options.some(o=>typeof o!=='string'||!o.trim()||o.length>1000)||new Set(item.options.map(normalize)).size!==item.options.length||!Array.isArray(item.correct)||item.correct.length!==1||!Number.isInteger(item.correct[0])||item.correct[0]<0||item.correct[0]>=item.options.length||!normalize(source.sourceExcerpt).includes(normalize(item.options[item.correct[0]])))throw fail(400,'QCM invalide : la bonne réponse doit rester attestée par l’extrait.')
        result.options=item.options;result.correct=item.correct
        result.why=item.options.map((_,i)=>i===item.correct[0]?`Le cours indique : « ${source.sourceExcerpt} ».`:'Cette proposition ne correspond pas à la réponse attestée dans l’extrait source.')
        result.edited ||= JSON.stringify(item.options)!==JSON.stringify(source.options)||JSON.stringify(item.correct)!==JSON.stringify(source.correct)
      }
      return result
    })
    const generation={...original.generation,reviewed:true,edited:items.some(i=>i.edited)}
    const now=new Date().toISOString()
    let saved
    db.exec('BEGIN IMMEDIATE')
    try {
      const previous=db.prepare('SELECT saved_json FROM study_generation_previews WHERE id=? AND user_id=?').get(preview.id,userId)
      if(previous.saved_json){db.exec('COMMIT');return JSON.parse(previous.saved_json)}
      if(preview.task==='questions'){
        const questions=items.map(item=>{
          const section=sections.find(s=>s.id===item.sectionId)
          return {id:`q-${randomUUID()}`,course:`doc-${doc.id}`,documentId:doc.id,prompt:item.text,options:item.options,correct:item.correct,why:item.why,sourceSectionId:section.id,sourcePages:[section.startPage,section.endPage],sourceExcerpt:item.sourceExcerpt,difficulty:'essentiel',format:'single'}
        })
        if(original.replace)db.prepare('DELETE FROM study_questions WHERE document_id=? AND user_id=?').run(doc.id,userId)
        const insert=db.prepare('INSERT INTO study_questions(id,document_id,user_id,section_id,start_page,end_page,prompt,options_json,correct_json,why_json,source_excerpt,difficulty,format,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        for(const q of questions)insert.run(q.id,doc.id,userId,q.sourceSectionId,...q.sourcePages,q.prompt,JSON.stringify(q.options),JSON.stringify(q.correct),JSON.stringify(q.why),q.sourceExcerpt,q.difficulty,q.format,now)
        saved={questions,count:questions.length,replaced:original.replace,generation,persisted:true}
      }else{
        const summary={title:doc.title,overview:`${preview.task==='revision'?'Fiche de révision':'Synthèse'} relue — ${doc.title}`,sectionCount:sections.length,kind:preview.task,generation,chapters:sections.flatMap(section=>{
          const points=items.filter(i=>i.sectionId===section.id)
          const labels=[...new Set(points.map(point=>point.category).filter(Boolean))]
          return points.length?[{id:section.id,title:section.title,pages:`${section.startPage}–${section.endPage}`,keyPoints:points.map(i=>i.text),excerpt:points[0].sourceExcerpt,proofs:points.map(i=>({text:i.text,sourceExcerpt:i.sourceExcerpt,edited:i.edited})),categories:labels.map((label,index)=>({id:`category-${index}`,label,items:points.filter(point=>point.category===label).map(point=>point.text)}))}]:[]
        })}
        db.prepare('DELETE FROM study_summaries WHERE document_id=? AND user_id=?').run(doc.id,userId)
        db.prepare('INSERT INTO study_summaries VALUES(?,?,?,?,?)').run(randomUUID(),doc.id,userId,JSON.stringify(summary),now)
        saved={summary,generation,persisted:true}
      }
      db.prepare('UPDATE study_generation_previews SET saved_json=? WHERE id=? AND user_id=?').run(JSON.stringify(saved),preview.id,userId)
      db.exec('COMMIT')
    }catch(error){db.exec('ROLLBACK');throw error}
    return saved
  }
  if(!['summary','revision','questions'].includes(body.task))throw fail(400,'Type de support inconnu.')
  if(body.count!==undefined&&(!Number.isInteger(body.count)||body.count<1||body.count>20))throw fail(400,'Choisissez entre 1 et 20 questions.')
  if(!sections.length)throw fail(422,'Aucune section disponible.')
  if(body.sectionId!==undefined&&!sections.some(s=>s.id===body.sectionId))throw fail(404,'Section introuvable.')
  const selected=body.sectionId?sections.filter(s=>s.id===body.sectionId):sections
  const task=body.task
  const result=await generateWithQuota({db,userId,provider:provider?.name==='gemini'?provider:null,config,task,context:{documentTitle:doc.title,kind:task,sections:selected,count:body.count||5},local:()=>task==='questions'?localQuestions(doc,selected,body.count||5,[]):localSummary(doc.title,selected)})
  const rows=toRows(result.value,task,selected).filter(row=>{
    const section=selected.find(s=>s.id===row.sectionId)
    return section&&typeof row.sourceExcerpt==='string'&&row.sourceExcerpt.length>=15&&normalize(section.content).includes(normalize(row.sourceExcerpt))
  }).map(row=>({...row,startPage:sourcePage(db,userId,doc.id,row.sourceExcerpt,selected.find(s=>s.id===row.sectionId).startPage),endPage:selected.find(s=>s.id===row.sectionId).endPage}))
  if(!rows.length){result.refund?.();throw fail(422,'Aucun support suffisamment étayé n’a été généré. Essayez une autre section.')}
  const payload={previewId:randomUUID(),task,items:rows,generation:result.generation,replace:body.replace===true,persisted:false}
  try {
    db.prepare('DELETE FROM study_generation_previews WHERE user_id=? AND expires_at<?').run(userId,Date.now())
    db.prepare('INSERT INTO study_generation_previews(id,user_id,document_id,task,payload_json,source_hash,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').run(payload.previewId,userId,doc.id,task,JSON.stringify(payload),fingerprint(sections),Date.now(),Date.now()+2*3600000)
  }catch(error){result.refund?.();throw error}
  return payload
}

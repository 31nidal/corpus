import {GenerationNotice,type GenerationInfo} from './ai/GenerationNotice'
import {useEffect,useRef,useState} from 'react'
import {ArrowRight,CheckCircle2,Quote,Target} from 'lucide-react'
import type {StudyDocument,StudyQuestion} from './myCoursesTypes'
import {fetchDocumentQuestions,generateDocumentQuestions,saveLearningAttempt} from './myCoursesApi'
import {isCorrect} from './questionScoring'
import {prioritizeQuestions,progressFor} from './learningProgress'
import {isDue,type ReviewRecord} from './reviewSchedule'
import {PdfCropSelector} from '../flashcards/PdfCropSelector'

type Session={items:StudyQuestion[];index:number;answers:Record<string,number[]>;validated:string[];done:boolean}
export function CourseTrainer({document,questions,records,onQuestions,onAnswer,onActivity,initialMode='adaptive'}:{initialMode?:'adaptive'|'errors';document:StudyDocument;questions:StudyQuestion[];records:Record<string,ReviewRecord>;onQuestions:(q:StudyQuestion[])=>void;onAnswer:(q:StudyQuestion,answers:number[])=>void;onActivity:()=>void}){
 const [section,setSection]=useState(''),[count,setCount]=useState(5),[mode,setMode]=useState<'adaptive'|'errors'|'due'>(initialMode)
 const [session,setSession]=useState<Session|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[page,setPage]=useState<number|null>(null)
 const [generation,setGeneration]=useState<GenerationInfo|null>(null)
 const alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 const lock=useRef(false),attemptIds=useRef<Record<string,string>>({})
 const eligible=(items:StudyQuestion[])=>items.filter(q=>q.documentId===document.id&&q.sourceEvidence?.verified&&(!section||q.sourceSectionId===section))
 const select=(items:StudyQuestion[])=>prioritizeQuestions(eligible(items).filter(q=>mode==='errors'?records[q.id]?.wrong:mode==='due'?isDue(records[q.id],Date.now()):true),records)
 const begin=async()=>{
  if(lock.current)return
  lock.current=true;setBusy(true);setError('');setNotice('')
  try{
   let pool=select(questions)
   if(pool.length<count&&mode==='adaptive'){
    await generateDocumentQuestions(document.id,count-pool.length,section||undefined,false,info=>{if(alive.current)setGeneration(info)})
    if(!alive.current)return
    const refreshed=await fetchDocumentQuestions(document.id);if(!alive.current)return;onQuestions(refreshed);pool=select(refreshed)
   }
   if(!pool.length)throw new Error(mode==='adaptive'?'Aucune question suffisamment sourcée n’est disponible pour ce chapitre. Votre PDF reste accessible.':mode==='errors'?'Aucune erreur enregistrée dans cette sélection.':'Aucune révision arrivée à échéance dans cette sélection.')
   const items=pool.slice(0,count)
   if(items.length<count)setNotice(`${items.length} question(s) sourcée(s) disponible(s) sur ${count} demandées. La séance utilise uniquement ces questions.`)
   attemptIds.current={};setSession({items,index:0,answers:{},validated:[],done:false})
  }catch(e){setError(e instanceof Error?e.message:'La génération a échoué. Réessayez sans perdre votre cours.')}
  finally{lock.current=false;setBusy(false)}
 }
 const validate=async(q:StudyQuestion,answers:number[])=>{
  if(lock.current||!session||session.validated.includes(q.id))return
  lock.current=true;setBusy(true);setError('')
  const attemptId=attemptIds.current[q.id]??=crypto.randomUUID()
  try{
   await saveLearningAttempt(document.id,attemptId,q.id,answers)
   onAnswer(q,answers)
   if(!alive.current)return
   setSession(s=>s?{...s,validated:[...s.validated,q.id]}:s);onActivity()
  }catch(e){setError(e instanceof Error?e.message:'Enregistrement impossible. Réessayez.')}finally{lock.current=false;setBusy(false)}
 }
 const p=progressFor(questions,records)
 const current=session&&!session.done?session.items[session.index]:null
 const answered=current&&session?.validated.includes(current.id)
 const selection=current?(session?.answers[current.id]||[]):[]
 return <section className="learning-trainer" aria-label="Interroge-moi">
  <header className="learning-section-heading"><div><span className="study-eyebrow">S’ENTRAÎNER</span><h2>Interroge-moi</h2><p>Répondez, comprenez la correction, retrouvez la preuve dans votre PDF.</p></div><Target size={32} aria-hidden="true"/></header>
  {(!session||session.done)&&<div className="learning-session-settings"><label>Chapitre<select value={section} onChange={e=>{setSection(e.target.value);setError('')}} disabled={busy}><option value="">Tout le cours</option>{document.sections?.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label><label>Nombre de questions<select value={count} onChange={e=>setCount(Number(e.target.value))} disabled={busy}>{[3,5,10,20].map(n=><option key={n}>{n}</option>)}</select></label><label>Priorité<select value={mode} onChange={e=>{setMode(e.target.value as typeof mode);setError('')}} disabled={busy}><option value="adaptive">Adaptée à mes difficultés</option><option value="errors">Réviser mes erreurs ({p.weak})</option><option value="due">Révisions du jour ({p.due})</option></select></label><button className="study-primary" disabled={busy} onClick={()=>void begin()}>{busy?'Préparation des questions…':session?'Nouvelle séance':'Commencer l’interrogation'} <ArrowRight size={16}/></button></div>}
  {!session&&<p className="learning-caption">Vos questions sourcées sont réutilisées en priorité. Une génération est demandée seulement s’il en manque. Les erreurs et les révisions échues passent avant les nouvelles questions.</p>}
  {generation&&<GenerationNotice generation={generation}/>}
  {notice&&<p role="status">{notice}</p>}
  {error&&<p role="alert" className="mycourses-alert mycourses-alert-error">{error}</p>}
  {current&&session&&<article className="learning-question" key={current.id}>
   <div className="learning-question-top"><span>Question {session.index+1} / {session.items.length}</span><span>{current.sourceSectionTitle||document.sections?.find(s=>s.id===current.sourceSectionId)?.title||'Chapitre du cours'}</span></div>
   <progress value={session.index} max={session.items.length} aria-label="Avancement de la séance"/>
   <h3>{current.prompt}</h3><p>{current.correct.length>1?'Plusieurs réponses attendues.':'Une seule réponse attendue.'}</p>
   <div className="answer-options">{current.options.map((option,index)=><button key={index} disabled={!!answered||busy} aria-pressed={selection.includes(index)} onClick={()=>setSession(s=>{if(!s)return s;const prev=s.answers[current.id]||[];const answers=current.correct.length===1?[index]:prev.includes(index)?prev.filter(i=>i!==index):[...prev,index];return {...s,answers:{...s.answers,[current.id]:answers}}})}><span className="option-letter">{String.fromCharCode(65+index)}</span><span>{option}</span></button>)}</div>
   {answered&&<section className="learning-correction" aria-label="Correction argumentée"><h3>{isCorrect(current,selection)?'Bonne réponse':'À retravailler'}</h3><ul>{current.options.map((option,i)=><li key={i}><strong>{current.correct.includes(i)?'Correct':'Incorrect'} · {option}</strong><p>{current.why[i]||'Aucune explication détaillée disponible pour cette proposition. Vérifiez le passage source.'}</p></li>)}</ul><blockquote><Quote size={18} aria-hidden="true"/>{current.sourceExcerpt}</blockquote>{current.sourceEvidence?.page?<button className="study-secondary" onClick={()=>setPage(current.sourceEvidence!.page)}>Voir le passage dans le PDF · p. {current.sourceEvidence.page}</button>:<><p>Extrait vérifié dans le chapitre ; page exacte non confirmée.</p><button className="study-secondary" onClick={()=>setPage(1)}>Ouvrir le PDF original</button></>}<p className="learning-caption">La citation est retrouvée dans le texte extrait. Vérifiez toujours la correction générée avec le PDF original.</p></section>}
   <div className="learning-question-actions">{!answered?<button className="study-primary" disabled={busy||!selection.length} onClick={()=>void validate(current,selection)}>{busy?'Enregistrement…':error?'Réessayer l’enregistrement':'Valider ma réponse'}</button>:<button className="study-primary" onClick={()=>setSession(s=>s?{...s,items:[...s.items.slice(0,s.index+1),...prioritizeQuestions(s.items.slice(s.index+1),records,Date.now(),questions)],index:s.index+1,done:s.index+1>=s.items.length}:s)}>{session.index+1===session.items.length?'Voir le bilan':'Question suivante'} <ArrowRight size={16}/></button>}<button className="study-secondary" disabled={busy} onClick={()=>{if(window.confirm('Quitter la séance ? Les réponses déjà validées sont conservées.'))setSession(null)}}>Quitter la séance</button></div>
  </article>}
  {session?.done&&<div className="learning-session-result" role="status"><CheckCircle2 size={36}/><h3>Séance terminée</h3><strong>{session.items.filter(q=>isCorrect(q,session.answers[q.id]||[])).length} / {session.items.length}</strong><p>Vos réponses sont enregistrées. Retrouvez les chapitres à retravailler dans « Mes lacunes ».</p><button className="study-secondary" onClick={()=>{setMode('errors');setSession(null)}}>Réviser mes erreurs</button></div>}
  {page!==null&&<PdfCropSelector documentId={document.id} documentTitle={document.title} initialPage={page} readOnly onCancel={()=>setPage(null)}/>}
 </section>
}

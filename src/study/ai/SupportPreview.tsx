import {useEffect,useRef,useState} from 'react'
import {PdfCropSelector} from '../../flashcards/PdfCropSelector'
import {GenerationNotice,useGenerationProvider} from './GenerationNotice'
import type {GenerationInfo} from './GenerationNotice'
import type {StudyDocument} from '../myCoursesTypes'
import './supports.css'

export type SupportTask='summary'|'revision'|'questions'
type Item={id:string;text:string;sourceExcerpt:string;sectionId:string;startPage:number;endPage:number;options?:string[];correct?:number[]}
type Preview={previewId:string;task:SupportTask;items:Item[];generation:GenerationInfo}
async function request(documentId:string,body:unknown) {
  const response=await fetch(`/api/study/documents/${encodeURIComponent(documentId)}/supports`,{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-mycorpus-request':'1'},body:JSON.stringify(body),signal:AbortSignal.timeout(210000)})
  const result=await response.json()
  if(!response.ok)throw new Error(result.error||'Impossible de préparer ce support.')
  return result
}
export function SupportPreview({document,task:initialTask,count=5,replace=false,onClose,onSaved}:{document:StudyDocument;task:SupportTask;count?:number;replace?:boolean;onClose:()=>void;onSaved:(task:SupportTask)=>void}) {
  const [task,setTask]=useState(initialTask),[preview,setPreview]=useState<Preview|null>(null)
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const [page,setPage]=useState<number|null>(null)
  const lock=useRef(false),dialog=useRef<HTMLElement>(null),opener=useRef<HTMLElement|null>(null),proofButton=useRef<HTMLButtonElement|null>(null)
  const provider=useGenerationProvider()
  useEffect(()=>{opener.current=window.document.activeElement as HTMLElement;dialog.current?.focus();return()=>{opener.current?.focus()}},[])
  const run=async(save=false)=>{
    if(lock.current)return
    lock.current=true;setBusy(true);setError('');setMessage(save?'Enregistrement…':'Analyse du cours et préparation du support…')
    try {
      const result=await request(document.id,save?{action:'save',previewId:preview!.previewId,items:preview!.items}:{action:'generate',task,count,replace})
      if(save){onSaved(task);onClose()}
      else{setPreview(result);setMessage(`${result.items.length} éléments prêts à relire. Aucun support enregistré.`)}
    }catch(e){setError(e instanceof Error?e.message:'Erreur réseau. Réessayez.');setMessage('La demande a échoué. Vos modifications restent affichées.')}
    finally{lock.current=false;setBusy(false)}
  }
  const update=(id:string,patch:Partial<Item>)=>setPreview(value=>value?{...value,items:value.items.map(i=>i.id===id?{...i,...patch}:i)}:value)
  return <div className="flash-modal-backdrop"><section ref={dialog} tabIndex={-1} className="flash-modal support-preview" role="dialog" aria-modal="true" aria-label="Prévisualisation du support" onKeyDown={event=>{
    if(page!==null)return
    if(event.key==='Escape'&&!busy){event.stopPropagation();onClose()}
    if(event.key==='Tab'){
      const focusable=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')||[])
      const first=focusable[0],last=focusable.at(-1)
      if(event.shiftKey&&window.document.activeElement===first){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&window.document.activeElement===last){event.preventDefault();first?.focus()}
    }
  }}>
    <header><h2>Préparer un support · {document.title}</h2><button disabled={busy} onClick={onClose}>Fermer</button></header>
    <GenerationNotice provider={provider} generation={preview?.generation}/>
    <p role="status" aria-live="polite">{message}</p>
    {!preview&&<><label>Support<select value={task} disabled={busy} onChange={e=>setTask(e.target.value as SupportTask)}><option value="summary">Synthèse</option><option value="revision">Fiche de révision</option><option value="questions">QCM</option></select></label><p>Toutes les sections du cours seront analysées. Le nombre d’éléments dépend des notions réellement exploitables.</p><button className="study-primary" disabled={busy} onClick={()=>void run()}>{busy?'Génération en cours…':'Générer la prévisualisation'}</button></>}
    {preview&&<div className="support-preview-items">{preview.items.map((item,index)=><article className="draft-review-card" key={item.id}>
      <label>{task==='questions'?`Question ${index+1}`:`Point ${index+1}`}<textarea disabled={busy} maxLength={2000} value={item.text} onChange={e=>update(item.id,{text:e.target.value})}/></label>
      {item.options?.map((option,i)=><label className="support-option" key={i}><input type="radio" disabled={busy} name={item.id} aria-label={`Bonne réponse ${i+1} de la question ${index+1}`} checked={item.correct?.[0]===i} onChange={()=>update(item.id,{correct:[i]})}/><input disabled={busy} aria-label={`Proposition ${i+1} de la question ${index+1}`} maxLength={1000} value={option} onChange={e=>update(item.id,{options:item.options!.map((v,j)=>j===i?e.target.value:v)})}/></label>)}
      <blockquote><strong>Preuve dans le cours</strong><p>{item.sourceExcerpt}</p></blockquote>
      <div className="draft-review-actions"><button disabled={busy} onClick={event=>{proofButton.current=event.currentTarget;setPage(item.startPage)}}>Voir dans le cours · p. {item.startPage}</button><button disabled={busy} onClick={()=>setPreview(value=>value?{...value,items:value.items.filter(i=>i.id!==item.id)}:value)}>Supprimer cet élément</button></div>
    </article>)}</div>}
    {error&&<p role="alert" className="flash-error">{error}</p>}
    {preview&&<button className="study-primary" disabled={busy||!preview.items.length} onClick={()=>void run(true)}>{busy?'Enregistrement…':'Valider et enregistrer le support'}</button>}
    {error&&<button disabled={busy} onClick={()=>void run(Boolean(preview))}>Réessayer</button>}
    {page!==null&&<PdfCropSelector documentId={document.id} documentTitle={document.title} initialPage={page} readOnly onCancel={()=>{setPage(null);requestAnimationFrame(()=>proofButton.current?.focus())}}/>}
  </section></div>
}

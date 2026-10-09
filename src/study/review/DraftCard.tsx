import {useEffect,useRef,useState} from 'react'
import type {NoteType} from '../../flashcards/flashcardsTypes'
import type {Draft} from './api'
const labels:Record<string,string>={basic:'Carte simple',reverse:'Inversée',bidirectional:'Bidirectionnelle',cloze:'Texte à trous',typed:'Réponse à saisir'}
export function DraftCard({draft,index,selected,busy,editing,sourceText,onSelect,onEdit,onSave,onCancel,onAction,onView,onFocus,register}:{draft:Draft;index:number;selected:boolean;busy:boolean;editing:boolean;sourceText:string;onSelect:(shift:boolean)=>void;onEdit:()=>void;onSave:(type:NoteType,fields:Record<string,unknown>)=>void;onCancel:()=>void;onAction:(action:'accept'|'reject'|'restore')=>void;onView:(button:HTMLButtonElement)=>void;onFocus:()=>void;register:(node:HTMLElement|null)=>void}) {
  const [type,setType]=useState(draft.noteType)
  const [front,setFront]=useState(draft.front),[back,setBack]=useState(draft.back)
  const [text,setText]=useState(String(draft.fields.text||draft.back))
  const input=useRef<HTMLTextAreaElement>(null)
  useEffect(()=>{if(editing){setType(draft.noteType);setFront(draft.front);setBack(draft.back);setText(String(draft.fields.text||draft.back));input.current?.focus()}},[editing,draft.id])
  const position=sourceText.indexOf(draft.sourceExcerpt)
  const before=position>=0?sourceText.slice(Math.max(0,position-80),position):''
  const after=position>=0?sourceText.slice(position+draft.sourceExcerpt.length,position+draft.sourceExcerpt.length+80):''
  return <article className="draft-review-card" ref={register} tabIndex={0} onFocus={onFocus} aria-label={`Brouillon ${index+1}`} data-draft-id={draft.id} data-status={draft.status}>
    <div className="draft-review-card-heading"><label><input type="checkbox" aria-label={`Sélectionner le brouillon ${index+1}`} checked={selected} disabled={busy} onChange={event=>onSelect(Boolean((event.nativeEvent as MouseEvent).shiftKey))}/> Brouillon {index+1}</label><span>{labels[draft.noteType]||draft.noteType} · {draft.status==='pending'?'En attente':draft.status==='edited'?'Modifié':draft.status==='accepted'?'Accepté':'Rejeté'}</span></div>
    {editing?<div data-review-editor className="draft-review-editor">
      <label>Type de carte<select disabled={busy} value={type} onChange={e=>setType(e.target.value as NoteType)}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      {type==='cloze'?<label>Texte à trous<textarea ref={input} aria-label="Texte à trous" disabled={busy} maxLength={4000} value={text} onChange={e=>setText(e.target.value)}/><small>Entourez une notion avec {'{{c1::notion}}'}.</small></label>:<><label>Recto<textarea ref={input} aria-label="Recto" disabled={busy} maxLength={2000} value={front} onChange={e=>setFront(e.target.value)}/></label><label>{type==='typed'?'Réponse exacte':'Verso'}<textarea aria-label={type==='typed'?'Réponse exacte':'Verso'} disabled={busy} maxLength={type==='typed'?200:8000} value={back} onChange={e=>setBack(e.target.value)}/></label></>}
      <div className="draft-review-actions"><button disabled={busy} onClick={()=>onSave(type,type==='cloze'?{text,extra:draft.fields.extra||''}:type==='typed'?{front,answer:back,acceptedAnswers:draft.fields.acceptedAnswers||[],extra:draft.fields.extra||''}:{front,back})}>Enregistrer les modifications</button><button disabled={busy} onClick={onCancel}>Annuler la modification</button></div>
    </div>:<><h3>{draft.front}</h3><p>{draft.back}</p></>}
    <blockquote aria-label="Preuve dans le cours">{before}<mark>{draft.sourceExcerpt}</mark>{after}</blockquote>
    <div className="draft-review-actions">
      <button disabled={busy} onClick={event=>onView(event.currentTarget)}>Voir dans le cours · p. {draft.page}</button>
      {draft.status!=='accepted'&&!editing&&<button disabled={busy} onClick={onEdit}>Modifier</button>}
      {['pending','edited'].includes(draft.status)&&<><button disabled={busy} onClick={()=>onAction('accept')}>Accepter</button><button disabled={busy} onClick={()=>onAction('reject')}>Rejeter</button></>}
      {draft.status==='rejected'&&<button disabled={busy} onClick={()=>onAction('restore')}>Restaurer</button>}
      {draft.acceptedNoteId&&<a href={`#tab=flashcards&revision=due&note=${encodeURIComponent(draft.acceptedNoteId)}`}>Réviser cette carte</a>}
    </div>
  </article>
}

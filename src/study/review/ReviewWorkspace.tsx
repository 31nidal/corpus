import {useEffect,useRef,useState} from 'react'
import type {KeyboardEvent} from 'react'
import type {StudyDocument} from '../myCoursesTypes'
import type {FlashcardDeck,NoteType} from '../../flashcards/flashcardsTypes'
import {createDeck,listDecks} from '../../flashcards/flashcardsApi'
import {PdfCropSelector} from '../../flashcards/PdfCropSelector'
import {actOnDrafts,generateDocumentDrafts,loadDraftPrefix,patchDraft} from './api'
import type {ActionResult,Draft,DraftList,DraftStatus,GenerationOptions as Options} from './api'
import {DraftCard} from './DraftCard'
import {GenerationOptions} from './GenerationOptions'
import './review.css'

type Action='accept'|'reject'|'restore'
const empty:DraftList={drafts:[],counts:{total:0,pending:0,edited:0,accepted:0,rejected:0,faithfulToCourse:0},filteredTotal:0,limit:50,offset:0,nextOffset:null}
export default function ReviewWorkspace({document,initialGenerate=false,generationRequest=0,onClose}:{document:StudyDocument;initialGenerate?:boolean;generationRequest?:number;onClose:()=>void}) {
  const [data,rawSetData]=useState(empty),[filter,setFilter]=useState<DraftStatus|''>('pending')
  const [selected,setSelected]=useState<Set<string>>(new Set()),[editing,setEditing]=useState<string|null>(null)
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  const [showGeneration,setShowGeneration]=useState(initialGenerate),[shortcuts,setShortcuts]=useState(true),[help,setHelp]=useState(false)
  useEffect(()=>{if(generationRequest>0)setShowGeneration(true)},[generationRequest])
  const [decks,setDecks]=useState<FlashcardDeck[]>([]),[deckId,setDeckId]=useState(''),[deckName,setDeckName]=useState('')
  const [progress,setProgress]=useState(''),[results,setResults]=useState<Record<string,ActionResult>>({})
  const [undo,setUndo]=useState<string[]>([]),[viewer,setViewer]=useState<Draft|null>(null)
  const lock=useRef(false),mounted=useRef(true),active=useRef<string|null>(null),anchor=useRef<string|null>(null)
  const nodes=useRef(new Map<string,HTMLElement>()),opener=useRef<HTMLButtonElement|null>(null)
  const retry=useRef<(()=>Promise<void>)|null>(null),dataRef=useRef(data),filterRef=useRef(filter)
  dataRef.current=data;filterRef.current=filter
  const updateData=(next:DraftList|((value:DraftList)=>DraftList))=>{const value=typeof next==='function'?next(dataRef.current):next;dataRef.current=value;rawSetData(value)}
  const setFailure=(problem:unknown,again:()=>Promise<void>)=>{setError(problem instanceof Error?problem.message:'Impossible de traiter la demande.');retry.current=again}
  const refresh=async(target=50,status=filterRef.current)=>{const value=await loadDraftPrefix(document.id,status,target);if(mounted.current)updateData(value)}
  const refreshDecks=async()=>{const items=await listDecks();if(mounted.current){setDecks(items);setDeckId(current=>current||items[0]?.id||'')}}
  useEffect(()=>{
    mounted.current=true;lock.current=true;setBusy(true)
    const initialize=async()=>{await Promise.all([refresh(),refreshDecks()])}
    void initialize().catch(e=>{if(mounted.current)setFailure(e,initialize)}).finally(()=>{lock.current=false;if(mounted.current)setBusy(false)})
    return()=>{mounted.current=false}
  },[document.id]) // Component is keyed by document ID.

  const perform=async(task:()=>Promise<void>,again=task)=>{
    if(lock.current)return
    lock.current=true;setBusy(true);setError('');retry.current=null
    try {await task()}catch(e){if(mounted.current)setFailure(e,again)}finally{lock.current=false;if(mounted.current)setBusy(false)}
  }
  const changeFilter=(status:DraftStatus|'')=>{if(lock.current)return;setFilter(status);filterRef.current=status;setSelected(new Set());setEditing(null);void perform(()=>refresh(50,status))}
  const applyDraft=(draft:Draft,previousStatus?:DraftStatus)=>updateData(current=>{
    const existing=current.drafts.find(d=>d.id===draft.id)
    const old=existing||(previousStatus?{...draft,status:previousStatus,faithfulToCourse:false}:null)
    if(!old)return current
    const counts={...current.counts}
    counts[old.status]--;counts[draft.status]++;counts.faithfulToCourse+=Number(draft.faithfulToCourse)-Number(old.faithfulToCourse)
    const keep=!filterRef.current||draft.status===filterRef.current
    const drafts=keep?(existing?current.drafts.map(d=>d.id===draft.id?draft:d):[...current.drafts,draft].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id))):current.drafts.filter(d=>d.id!==draft.id)
    return {...current,counts,drafts,filteredTotal:current.filteredTotal+(existing?(keep?0:-1):(keep?1:0))}
  })
  // Optimistically remove status changes from the filtered list; keep a snapshot
  // per request, so a failed request rolls back only its own chunk.
  const optimistic=(ids:string[],action:Action)=>updateData(current=>{
    const changed=current.drafts.map(d=>ids.includes(d.id)?{...d,status:(action==='accept'?'accepted':action==='reject'?'rejected':d.rejectedFrom||'pending') as DraftStatus}:d)
    return {...current,drafts:changed.filter(d=>!filterRef.current||d.status===filterRef.current)}
  })
  const runBatch=async(action:Action,ids:string[],done=0,total=ids.length)=>{
    if(action==='accept'&&!deckId)throw new Error('Choisissez ou créez un deck de destination.')
    const rejected:string[]=[]
    for(let offset=0;offset<ids.length;offset+=100) {
      const chunk=ids.slice(offset,offset+100),snapshot=dataRef.current
      optimistic(chunk,action)
      let response:{results:ActionResult[]}
      try {response=await actOnDrafts(document.id,action,chunk,deckId)}catch(e){updateData(snapshot);retry.current=()=>runBatch(action,ids.slice(offset),done+offset,total);throw e}
      // Reconcile from the pre-request snapshot, including individual failures.
      updateData(snapshot)
      setResults(current=>({...current,...Object.fromEntries(response.results.map(r=>[r.id,r]))}))
      const successful=new Set<string>()
      for(const result of response.results) {
        if(result.draft){applyDraft(result.draft,action==='restore'?'rejected':undefined);successful.add(result.id);if(result.status==='rejected')rejected.push(result.id)}
      }
      setSelected(current=>new Set([...current].filter(id=>!successful.has(id))))
      if(action==='restore')setUndo(current=>current.filter(id=>!successful.has(id)))
      setProgress(`${done+offset+chunk.length}/${total}`)
      const failed=response.results.filter(r=>r.status==='invalid'||r.status==='not_found')
      if(failed.length)setError(failed.map(r=>r.error||'Brouillon introuvable.').join(' '))
      if(rejected.length)setUndo(current=>[...new Set([...current,...rejected])])
    }
    requestAnimationFrame(()=>{if(globalThis.document.activeElement===globalThis.document.body){const next=dataRef.current.drafts[0];if(next)nodes.current.get(next.id)?.focus()}})
    setMessage(action==='accept'?'Acceptation terminée.':action==='reject'?'Rejeté. Annuler.':'Brouillons restaurés.')
  }
  const batch=(action:Action,ids:string[])=>{
    if(!ids.length||lock.current)return
    setProgress(`0/${ids.length}`)
    // Preserve the retry closure for the uncompleted suffix on a network error.
    void perform(async()=>{try{await runBatch(action,ids)}catch(e){const remaining=retry.current;setFailure(e,remaining||(()=>runBatch(action,ids)))}})
  }
  const save=(draft:Draft,type:NoteType,fields:Record<string,unknown>)=>void perform(async()=>{
    const snapshot=dataRef.current
    const optimisticDraft={...draft,noteType:type,front:String(fields.front||fields.text||''),back:String(fields.back||fields.answer||''),fields,status:draft.status,faithfulToCourse:false}
    applyDraft(optimisticDraft)
    try {const response=await patchDraft(draft.id,type,fields);updateData(snapshot);applyDraft(response.draft);setEditing(null);setSelected(current=>new Set([...current].filter(id=>id!==draft.id)));setMessage('Modification enregistrée.')}
    catch(e){updateData(snapshot);throw e}
  })
  const select=(id:string,shift:boolean)=>{
    const ids=data.drafts.map(d=>d.id),start=anchor.current?ids.indexOf(anchor.current):-1,end=ids.indexOf(id)
    setSelected(current=>{const next=new Set(current);if(shift&&start>=0){for(const item of ids.slice(Math.min(start,end),Math.max(start,end)+1))next.add(item)}else if(next.has(id))next.delete(id);else next.add(id);return next})
    anchor.current=id
  }
  const selectAll=()=>void perform(async()=>{const value=await loadDraftPrefix(document.id,filter,data.filteredTotal||50);updateData(value);setSelected(new Set(value.drafts.filter(d=>d.status!=='accepted').map(d=>d.id)))})
  const generate=(options:Options)=>void perform(async()=>{
    const result=await generateDocumentDrafts(document.id,options)
    const messages=[]
    if(result.generated===0)messages.push('Aucun brouillon généré, ce cours contient peu de phrases exploitables.')
    if(result.created)messages.push(`${result.created} brouillons générés, à réviser.`)
    if(result.ignored)messages.push(`${result.ignored} brouillons ignorés car déjà générés.`)
    if(result.unattributed)messages.push(`${result.unattributed} brouillons sans preuve attribuable n’ont pas été conservés.`)
    setMessage(messages.join(' '));setShowGeneration(false);setFilter('pending');filterRef.current='pending';setSelected(new Set());await refresh(50,'pending')
  })
  const keyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
    const target=event.target as HTMLElement
    if(!shortcuts||busy||editing||viewer||event.altKey||event.ctrlKey||event.metaKey||target.closest('input,textarea,select,[contenteditable],[data-review-editor],[role="dialog"]'))return
    const key=event.key.toLowerCase(),draft=data.drafts.find(d=>d.id===active.current)
    if(key==='?'){event.preventDefault();setHelp(value=>!value);return}
    if(key==='arrowdown'||key==='arrowup'){event.preventDefault();const index=data.drafts.findIndex(d=>d.id===active.current),next=data.drafts[Math.max(0,Math.min(data.drafts.length-1,index+(key==='arrowdown'?1:-1)))];if(next)nodes.current.get(next.id)?.focus();return}
    if(!draft)return
    if(key==='e'&&draft.status!=='accepted'){event.preventDefault();setEditing(draft.id)}
    if(key==='a'&&['pending','edited'].includes(draft.status)){event.preventDefault();batch('accept',[draft.id])}
    if(key==='r'&&['pending','edited'].includes(draft.status)){event.preventDefault();batch('reject',[draft.id])}
  }
  const closeViewer=()=>{setViewer(null);requestAnimationFrame(()=>opener.current?.focus())}
  return <section className="draft-review-workspace" aria-label="Révision des brouillons">
    <header className="draft-review-heading"><div><h2>Révision des flashcards</h2><p aria-live="polite" aria-atomic="true">{data.counts.pending} en attente · {data.counts.edited} modifiés · {selected.size} sélectionnés</p></div><button disabled={busy} onClick={onClose}>Fermer la révision</button></header>
    <div className="draft-review-actions"><button disabled={busy} onClick={()=>setShowGeneration(value=>!value)}>Configurer la génération</button><label><input type="checkbox" checked={shortcuts} onChange={e=>setShortcuts(e.target.checked)}/> Activer les raccourcis clavier</label><button onClick={()=>setHelp(value=>!value)} aria-expanded={help}>Aide des raccourcis (?)</button></div>
    {help&&<p role="note">Dans la liste : A pour accepter, E pour modifier, R pour rejeter, flèches pour naviguer, ? pour cette aide. Les raccourcis sont désactivés dans les champs, pendant l’édition et dans les dialogues.</p>}
    {showGeneration&&<GenerationOptions document={document} busy={busy} onGenerate={generate}/>}
    <div className="draft-review-fields"><label>Filtrer les brouillons<select disabled={busy} value={filter} onChange={e=>changeFilter(e.target.value as DraftStatus|'')}><option value="pending">En attente</option><option value="edited">Modifiés</option><option value="accepted">Acceptés</option><option value="rejected">Rejetés</option><option value="">Tous les statuts</option></select></label><label>Deck de destination<select aria-label="Deck de destination" disabled={busy} value={deckId} onChange={e=>setDeckId(e.target.value)}><option value="">Choisir un deck</option>{decks.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Nouveau deck<input maxLength={100} value={deckName} onChange={e=>setDeckName(e.target.value)} disabled={busy}/></label><button disabled={busy||!deckName.trim()} onClick={()=>void perform(async()=>{const deck=await createDeck({name:deckName});setDecks(items=>[deck,...items]);setDeckId(deck.id);setDeckName('')})}>Créer le deck</button></div>
    <div className="draft-review-actions"><button disabled={busy||!data.filteredTotal} onClick={selectAll}>Tout sélectionner sur la vue filtrée</button><button disabled={busy||!selected.size} onClick={()=>setSelected(new Set())}>Tout désélectionner</button><button disabled={busy||!selected.size||!deckId} onClick={()=>batch('accept',[...selected])}>Accepter la sélection</button><button disabled={busy||!selected.size} onClick={()=>batch('reject',[...selected])}>Rejeter la sélection</button></div>
    {progress&&<p role="status" aria-live="polite">Traitement : {progress}</p>}
    {message&&<p role="status" aria-live="polite">{message}</p>}
    {!!undo.length&&<div className="draft-review-undo" role="status" aria-live="polite">Rejeté. <button disabled={busy} onClick={()=>batch('restore',undo)}>Annuler</button><button disabled={busy} onClick={()=>setUndo([])}>Masquer ce message</button></div>}
    {error&&<div className="flash-error" role="alert">{error}{retry.current&&<button disabled={busy} onClick={()=>{const task=retry.current;if(task)void perform(async()=>{try{await task()}catch(e){const remaining=retry.current;setFailure(e,remaining||task)}})}}>Réessayer</button>}</div>}
    {busy&&!data.drafts.length&&<p role="status">Chargement…</p>}
    {!busy&&!error&&!data.drafts.length&&<p>{data.counts.total===0?'Aucun brouillon enregistré. Générez des brouillons depuis ce cours.':'Aucun brouillon dans ce filtre.'}</p>}
    <div className="draft-review-list" role="region" aria-label="Liste de révision" onKeyDown={keyDown}>{data.drafts.map((draft,index)=><DraftCard key={draft.id} draft={draft} index={index} selected={selected.has(draft.id)} busy={busy} editing={editing===draft.id} sourceText={document.sections?.find(s=>s.id===draft.sectionId)?.content||draft.sourceExcerpt} onSelect={shift=>select(draft.id,shift)} onEdit={()=>setEditing(draft.id)} onCancel={()=>{setEditing(null);nodes.current.get(draft.id)?.focus()}} onSave={(type,fields)=>save(draft,type,fields)} onAction={action=>batch(action,[draft.id])} onView={button=>{opener.current=button;setViewer(draft)}} onFocus={()=>{active.current=draft.id}} register={node=>{if(node)nodes.current.set(draft.id,node);else nodes.current.delete(draft.id)}}/>)}</div>
    {data.drafts.length<data.filteredTotal&&<button disabled={busy} onClick={()=>void perform(()=>refresh(data.drafts.length+50))}>Charger la suite</button>}
    {Object.values(results).some(r=>r.noteId)&&<div className="draft-review-created" aria-label="Cartes créées">{Object.values(results).filter(r=>r.noteId).map(r=><a key={r.id} href={`#tab=flashcards&revision=due&note=${encodeURIComponent(r.noteId!)}`}>Réviser la carte créée · {r.note?.fields.front||r.note?.fields.text||'Flashcard'}</a>)}</div>}
    {viewer&&<PdfCropSelector documentId={document.id} documentTitle={document.title} initialPage={viewer.page} readOnly onCancel={closeViewer}/>}
  </section>
}

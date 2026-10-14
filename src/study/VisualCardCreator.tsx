import {useEffect,useState} from 'react'
import type {StudyDocument} from './myCoursesTypes'
import type {FlashcardDeck} from '../flashcards/flashcardsTypes'
import {listDecks,createDeck} from '../flashcards/flashcardsApi'
import {PdfCropSelector} from '../flashcards/PdfCropSelector'
import {ImageOcclusionEditor} from '../flashcards/ImageOcclusionEditor'

type CropResult={blob:Blob;pageNumber:number;crop:{x:number;y:number;width:number;height:number}|null}
export default function VisualCardCreator({document,initialPage=1,onClose,onCreated}: {
  document:StudyDocument;initialPage?:number;onClose:()=>void;onCreated:(count:number)=>void
}) {
  const [decks,setDecks]=useState<FlashcardDeck[]|null>(null),[error,setError]=useState(''),[reload,setReload]=useState(0)
  const [crop,setCrop]=useState<CropResult|null>(null),[url,setUrl]=useState(''),[deckName,setDeckName]=useState(''),[busy,setBusy]=useState(false)
  useEffect(()=>{
    let active=true
    listDecks().then(value=>{if(active){setDecks(value);setError('')}}).catch(problem=>{if(active)setError(problem.message)})
    return()=>{active=false}
  },[document.id,reload])
  useEffect(()=>{
    if(!crop){setUrl('');return}
    const value=URL.createObjectURL(crop.blob)
    setUrl(value)
    return()=>URL.revokeObjectURL(value)
  },[crop])
  if(error||!decks||!decks.length)return <section aria-label="Créer une carte visuelle">
    <button onClick={onClose}>Fermer la création visuelle</button>
    {!decks&&!error&&<p role="status">Chargement des decks…</p>}
    {error&&<div role="alert"><p>{error}</p><button onClick={()=>setReload(value=>value+1)}>Réessayer</button></div>}
    {decks&&!decks.length&&<form onSubmit={async event=>{
      event.preventDefault();if(busy)return;setBusy(true);setError('')
      try{const deck=await createDeck({name:deckName});setDecks([deck])}catch(problem){setError((problem as Error).message)}finally{setBusy(false)}
    }}><p>Choisissez un deck de destination pour votre carte visuelle.</p><label>Nom du nouveau deck<input value={deckName} disabled={busy} maxLength={120} onChange={event=>setDeckName(event.target.value)}/></label><button disabled={busy||!deckName.trim()}>Créer le deck de destination</button></form>}
  </section>
  if(!crop)return <PdfCropSelector documentId={document.id} documentTitle={document.title} initialPage={initialPage} onSelectCrop={setCrop} onCancel={onClose}/>
  if(!url)return <p role="status">Préparation de l’image…</p>
  return <ImageOcclusionEditor imageSrc={url} imageBlob={crop.blob} defaultDeckId={decks[0].id} decks={decks}
    sourceMetadata={{sourceKind:'study_document',sourceDocumentId:document.id,sourcePage:crop.pageNumber,sourceCrop:crop.crop||undefined}}
    initialSubject={document.title} initialChapter={document.title} onCancel={onClose}
    onCreated={note=>onCreated(note.cards?.length||1)}/>
}

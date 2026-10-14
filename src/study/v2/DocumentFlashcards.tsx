import {lazy,Suspense,useState} from 'react'
import type {StudyDocument} from '../myCoursesTypes'
import type {PdfSelection} from './types'
const ReviewWorkspace=lazy(()=>import('../review/ReviewWorkspace'))
const VisualCardCreator=lazy(()=>import('../VisualCardCreator'))
export default function DocumentFlashcards({document,selection,page,onClose}: {
  document:StudyDocument;selection:PdfSelection|null;page:number;onClose:()=>void
}) {
  const [visual,setVisual]=useState(false),[message,setMessage]=useState('')
  return <section aria-label="Flashcards du cours">
    <button onClick={()=>setVisual(true)}>Créer une carte visuelle depuis le PDF</button>
    <p role="status">{message}</p>
    <Suspense fallback={<p role="status">Chargement des flashcards…</p>}>
      {visual&&<VisualCardCreator document={document} initialPage={page} onClose={()=>setVisual(false)} onCreated={count=>{setVisual(false);setMessage(`Note d’occlusion créée (${count} carte${count>1?'s':''}).`)}}/>}
      <ReviewWorkspace document={document} initialGenerate={Boolean(selection)} sourceSelection={selection||undefined} onClose={onClose}/>
    </Suspense>
  </section>
}

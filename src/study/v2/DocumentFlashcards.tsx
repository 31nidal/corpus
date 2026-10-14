import {lazy, Suspense, useRef, useState} from 'react'
import type {StudyDocument} from '../myCoursesTypes'
import type {PdfSelection} from './types'

const ReviewWorkspace = lazy(() => import('../review/ReviewWorkspace'))
const VisualCardCreator = lazy(() => import('../VisualCardCreator'))
const FlashcardsWorkspace = lazy(() => import('../../flashcards/FlashcardsWorkspace'))

export default function DocumentFlashcards({document, selection, page, onClose}: {
  document: StudyDocument; selection: PdfSelection | null; page: number; onClose: () => void
}) {
  const [visual, setVisual] = useState(false)
  const [message, setMessage] = useState('')
  const [reviewNoteId, setReviewNoteId] = useState<string | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  function openReview(noteId: string) {
    opener.current = window.document.activeElement as HTMLElement
    setReviewNoteId(noteId)
  }
  function closeReview() {
    setReviewNoteId(null)
    requestAnimationFrame(() => opener.current?.focus())
  }
  return <section aria-label="Flashcards du cours">
    <div hidden={Boolean(reviewNoteId)}>
      <button onClick={() => setVisual(true)}>Créer une carte visuelle depuis le PDF</button>
      <p role="status">{message}</p>
      <Suspense fallback={<p role="status">Chargement des flashcards…</p>}>
        {visual && <VisualCardCreator document={document} initialPage={page} onClose={() => setVisual(false)}
          onCreated={count => {
            setVisual(false)
            setMessage(`Note d’occlusion créée (${count} carte${count > 1 ? 's' : ''}).`)
          }}/>}

        <ReviewWorkspace document={document} initialGenerate={Boolean(selection)}
          sourceSelection={selection || undefined} onClose={onClose} onReviewNote={openReview}/>
      </Suspense>
    </div>
    {reviewNoteId && <div className="sv2-course-review"><Suspense fallback={<p role="status">Chargement de la révision FSRS…</p>}>
      {/* Only the existing review session is shown; account switching is owned by StudyEntry. */}
      <FlashcardsWorkspace key={reviewNoteId} initialReviewNoteId={reviewNoteId} onReviewExit={closeReview}
        openAccount={() => {}} openCourse={() => {}} openDocument={() => {}}/>
    </Suspense></div>}
  </section>
}

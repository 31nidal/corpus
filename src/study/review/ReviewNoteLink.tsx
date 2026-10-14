import type {ReactNode} from 'react'

/** Preserve the existing route for classic mode and modifier/new-tab clicks. */
export function ReviewNoteLink({noteId, onReview, children}: {
  noteId: string; onReview?: (noteId: string) => void; children: ReactNode
}) {
  return <a href={`#tab=flashcards&revision=due&note=${encodeURIComponent(noteId)}`}
    onClick={event => {
      if (!onReview || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault(); onReview(noteId)
    }}>{children}</a>
}

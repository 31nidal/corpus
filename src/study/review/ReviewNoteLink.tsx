import type {ReactNode} from 'react'

/** Preserve the existing route for classic mode and modifier/new-tab clicks. */
export function ReviewNoteLink({noteId, onReview, children}: {
  noteId: string; onReview?: (noteId: string) => void; children: ReactNode
}) {
  return <a href={`#tab=flashcards&revision=due&note=${encodeURIComponent(noteId)}`}
    onClick={event => {
      if (!onReview || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      // Safari does not focus links clicked with a pointer. Capture the actual
      // trigger before hiding the list so closing review restores its focus.
      event.preventDefault(); event.currentTarget.focus(); onReview(noteId)
    }}>{children}</a>
}

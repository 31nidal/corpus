import {ReviewNoteLink} from './ReviewNoteLink';
import type { StudyDocument } from "../myCoursesTypes";
import type { DraftReview } from "./useDraftReview";
import { DraftCard } from "./DraftCard";

export function ReviewList({ document, review, onReviewNote }: { document: StudyDocument; review: DraftReview; onReviewNote?: (noteId:string)=>void }) {
  return (
    <div
      className="draft-review-list"
      role="region"
      aria-label="Liste de révision"
      onKeyDown={review.keyDown}
    >
      {review.data.drafts.map((draft, index) => (
        <DraftCard
          key={draft.id}
          draft={draft}
          index={index}
          selected={review.selected.has(draft.id)}
          busy={review.busy}
          editing={review.editing === draft.id}
          sourceText={
            document.sections?.find((section) => section.id === draft.sectionId)?.content ||
            draft.sourceExcerpt
          }
          onReviewNote={onReviewNote}
          onSelect={(shift) => review.select(draft.id, shift)}
          onEdit={() => review.setEditing(draft.id)}
          onRegenerate={review.provider?.mode==='gemini'?()=>review.regenerate(draft.id):undefined}
          onCancel={() => review.cancelEditing(draft.id)}
          onSave={(type, fields) => review.save(draft, type, fields)}
          onAction={(action) => review.batch(action, [draft.id])}
          onView={(button) => review.viewSource(draft, button)}
          onFocus={() => review.focusDraft(draft.id)}
          register={(node) => review.registerDraft(draft.id, node)}
        />
      ))}
    </div>
  );
}

export function CreatedCards({ review, onReviewNote }: { review: DraftReview; onReviewNote?: (noteId:string)=>void }) {
  const results = Object.values(review.results).filter((result) => result.noteId);
  if (!results.length) return null;
  return (
    <div className="draft-review-created" aria-label="Cartes créées">
      {results.map((result) => (
        <ReviewNoteLink key={result.id} noteId={result.noteId!} onReview={onReviewNote}>
          Réviser la carte créée ·{" "}
          {result.note?.fields.front || result.note?.fields.text || "Flashcard"}
        </ReviewNoteLink>
      ))}
    </div>
  );
}

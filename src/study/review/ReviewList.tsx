import type { StudyDocument } from "../myCoursesTypes";
import type { DraftReview } from "./useDraftReview";
import { DraftCard } from "./DraftCard";

export function ReviewList({ document, review }: { document: StudyDocument; review: DraftReview }) {
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
          onSelect={(shift) => review.select(draft.id, shift)}
          onEdit={() => review.setEditing(draft.id)}
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

export function CreatedCards({ review }: { review: DraftReview }) {
  const results = Object.values(review.results).filter((result) => result.noteId);
  if (!results.length) return null;
  return (
    <div className="draft-review-created" aria-label="Cartes créées">
      {results.map((result) => (
        <a
          key={result.id}
          href={`#tab=flashcards&revision=due&note=${encodeURIComponent(result.noteId!)}`}
        >
          Réviser la carte créée ·{" "}
          {result.note?.fields.front || result.note?.fields.text || "Flashcard"}
        </a>
      ))}
    </div>
  );
}

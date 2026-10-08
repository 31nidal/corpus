import { PdfCropSelector } from "../../flashcards/PdfCropSelector";
import { GenerationOptions } from "./GenerationOptions";
import { ReviewActions, ReviewDestination, ReviewSelectionActions } from "./ReviewActions";
import { CreatedCards, ReviewList } from "./ReviewList";
import { ReviewAnnouncements, ReviewStatus } from "./ReviewStatus";
import { useDraftReview } from "./useDraftReview";
import type { ReviewOptions } from "./useDraftReview";
import "./review.css";

export default function ReviewWorkspace(props: ReviewOptions & { onClose: () => void }) {
  const review = useDraftReview(props);
  const { document, onClose } = props;

  return (
    <section className="draft-review-workspace" aria-label="Révision des brouillons">
      <header className="draft-review-heading">
        <div>
          <h2>Révision des flashcards</h2>
          <ReviewAnnouncements review={review} />
        </div>
        <button disabled={review.busy} onClick={onClose}>
          Fermer la révision
        </button>
      </header>
      <ReviewActions review={review} />
      {review.showGeneration && (
        <GenerationOptions document={document} busy={review.busy} onGenerate={review.generate} />
      )}
      <ReviewDestination review={review} />
      <ReviewSelectionActions review={review} />
      <ReviewStatus review={review} />
      <ReviewList document={document} review={review} />
      {review.data.drafts.length < review.data.filteredTotal && (
        <button disabled={review.busy} onClick={review.loadMore}>
          Charger la suite
        </button>
      )}
      <CreatedCards review={review} />
      {review.viewer && (
        <PdfCropSelector
          documentId={document.id}
          documentTitle={document.title}
          initialPage={review.viewer.page}
          readOnly
          onCancel={review.closeViewer}
        />
      )}
    </section>
  );
}

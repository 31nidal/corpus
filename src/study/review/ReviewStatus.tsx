import type { DraftReview } from "./useDraftReview";

export function UndoBanner({ review }: { review: DraftReview }) {
  if (!review.undo.length) return null;
  return (
    <div className="draft-review-undo" role="status" aria-live="polite">
      Rejeté.{" "}
      <button disabled={review.busy} onClick={() => review.batch("restore", review.undo)}>
        Annuler
      </button>
      <button disabled={review.busy} onClick={() => review.setUndo([])}>
        Masquer ce message
      </button>
    </div>
  );
}

export function ReviewStatus({ review }: { review: DraftReview }) {
  return (
    <>
      {review.progress && (
        <p role="status" aria-live="polite">
          Traitement : {review.progress}
        </p>
      )}
      {review.message && (
        <p role="status" aria-live="polite">
          {review.message}
        </p>
      )}
      <UndoBanner review={review} />
      {review.error && (
        <div className="flash-error" role="alert">
          {review.error}
          {review.canRetry && (
            <button disabled={review.busy} onClick={review.retryFailure}>
              Réessayer
            </button>
          )}
        </div>
      )}
      {review.busy && !review.data.drafts.length && <p role="status">Chargement…</p>}
      {!review.busy && !review.error && !review.data.drafts.length && (
        <p>
          {review.data.counts.total === 0
            ? "Aucun brouillon enregistré. Générez des brouillons depuis ce cours."
            : "Aucun brouillon dans ce filtre."}
        </p>
      )}
    </>
  );
}

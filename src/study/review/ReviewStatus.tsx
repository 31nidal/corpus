import type { DraftReview } from "./useDraftReview";

export function UndoBanner({ review }: { review: DraftReview }) {
  if (!review.undo.length) return null;
  return (
    <div className="draft-review-undo">
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

export function ReviewAnnouncements({ review }: { review: DraftReview }) {
  const counts = `${review.data.counts.pending} en attente · ${review.data.counts.edited} modifiés · ${review.selected.size} sélectionnés`;
  const announcements = [
    review.busy ? "Chargement…" : "",
    review.progress ? `Progression : ${review.progress.replace("/", " sur ")}` : "",
    review.message,
    review.undo.length && !review.message.includes("Rejeté.") ? "Rejeté. Annuler." : "",
    review.error,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      <p>{counts}</p>
      <p className="draft-review-announcements">État de la révision : {announcements}</p>
    </div>
  );
}

export function ReviewStatus({ review }: { review: DraftReview }) {
  return (
    <>
      {review.progress && <p>Traitement : {review.progress}</p>}
      {review.message && <p>{review.message}</p>}
      <UndoBanner review={review} />
      {review.error && (
        <div className="flash-error" role="alert" aria-live="off">
          {review.error}
          {review.canRetry && (
            <button disabled={review.busy} onClick={review.retryFailure}>
              Réessayer
            </button>
          )}
        </div>
      )}
      {review.busy && !review.data.drafts.length && <p>Chargement…</p>}
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

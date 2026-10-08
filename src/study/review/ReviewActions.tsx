import type { DraftStatus } from "./api";
import type { DraftReview } from "./useDraftReview";

export function ReviewActions({ review }: { review: DraftReview }) {
  const { busy, shortcuts, help, setShowGeneration, setShortcuts, setHelp } =
    review;

  return (
    <>
      <div className="draft-review-actions">
        <button disabled={busy} onClick={() => setShowGeneration((value) => !value)}>
          Configurer la génération
        </button>
        <label>
          <input
            type="checkbox"
            checked={shortcuts}
            onChange={(event) => setShortcuts(event.target.checked)}
          />{" "}
          Activer les raccourcis clavier
        </label>
        <button onClick={() => setHelp((value) => !value)} aria-expanded={help}>
          Aide des raccourcis (?)
        </button>
      </div>
      {help && (
        <p role="note">
          Dans la liste : A pour accepter, E pour modifier, R pour rejeter, flèches pour naviguer, ?
          pour cette aide. Les raccourcis sont désactivés dans les champs, pendant l’édition et dans
          les dialogues.
        </p>
      )}
    </>
  );
}

export function ReviewSelectionActions({ review }: { review: DraftReview }) {
  const { busy, data, selected, deckId, selectAll, setSelected, batch } = review;
  return (
    <div className="draft-review-actions">
      <button disabled={busy || !data.filteredTotal} onClick={selectAll}>
        Tout sélectionner sur la vue filtrée
      </button>
      <button disabled={busy || !selected.size} onClick={() => setSelected(new Set())}>
        Tout désélectionner
      </button>
      <button
        disabled={busy || !selected.size || !deckId}
        onClick={() => batch("accept", [...selected])}
      >
        Accepter la sélection
      </button>
      <button disabled={busy || !selected.size} onClick={() => batch("reject", [...selected])}>
        Rejeter la sélection
      </button>
    </div>
  );
}

export function ReviewDestination({ review }: { review: DraftReview }) {
  const { busy, filter, decks, deckId, deckName, changeFilter, setDeckId, setDeckName, addDeck } =
    review;
  return (
    <div className="draft-review-fields">
      <label>
        Filtrer les brouillons
        <select
          disabled={busy}
          value={filter}
          onChange={(event) => changeFilter(event.target.value as DraftStatus | "")}
        >
          <option value="pending">En attente</option>
          <option value="edited">Modifiés</option>
          <option value="accepted">Acceptés</option>
          <option value="rejected">Rejetés</option>
          <option value="">Tous les statuts</option>
        </select>
      </label>
      <label>
        Deck de destination
        <select
          aria-label="Deck de destination"
          disabled={busy}
          value={deckId}
          onChange={(event) => setDeckId(event.target.value)}
        >
          <option value="">Choisir un deck</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nouveau deck
        <input
          maxLength={100}
          value={deckName}
          disabled={busy}
          onChange={(event) => setDeckName(event.target.value)}
        />
      </label>
      <button disabled={busy || !deckName.trim()} onClick={addDeck}>
        Créer le deck
      </button>
    </div>
  );
}

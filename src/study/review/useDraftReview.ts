import { useEffect, useRef, useState } from "react";
import type { StudyDocument } from "../myCoursesTypes";
import type { FlashcardDeck, NoteType } from "../../flashcards/flashcardsTypes";
import { createDeck, listDecks } from "../../flashcards/flashcardsApi";
import { generateDocumentDrafts, loadDraftPrefix, patchDraft } from "./api";
import type { ActionResult, Draft, DraftList, DraftStatus, GenerationOptions } from "./api";
import { useSequentialDraftBatches } from "./useSequentialDraftBatches";
import { useReviewListNavigation } from "./useReviewListNavigation";
import type { DraftAction } from "./useSequentialDraftBatches";
const empty: DraftList = {
  drafts: [],
  counts: { total: 0, pending: 0, edited: 0, accepted: 0, rejected: 0, faithfulToCourse: 0 },
  filteredTotal: 0,
  limit: 50,
  offset: 0,
  nextOffset: null,
};
export type ReviewOptions = {
  document: StudyDocument;
  initialGenerate?: boolean;
  generationRequest?: number;
};
export function useDraftReview({
  document,
  initialGenerate = false,
  generationRequest = 0,
}: ReviewOptions) {
  const [data, rawSetData] = useState(empty),
    [filter, setFilter] = useState<DraftStatus | "">("pending");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [showGeneration, setShowGeneration] = useState(initialGenerate);
  useEffect(() => {
    if (generationRequest > 0) setShowGeneration(true);
  }, [generationRequest]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]),
    [deckId, setDeckId] = useState(""),
    [deckName, setDeckName] = useState("");
  const [progress, setProgress] = useState(""),
    [results, setResults] = useState<Record<string, ActionResult>>({});
  const [undo, setUndo] = useState<string[]>([]),
    [viewer, setViewer] = useState<Draft | null>(null);
  const lock = useRef(false),
    mounted = useRef(true);
  const opener = useRef<HTMLButtonElement | null>(null);
  const navigation = useReviewListNavigation({
    data,
    busy,
    editing,
    viewerOpen: Boolean(viewer),
    setEditing,
    onBatch: (action, ids) => batch(action, ids),
  });
  const { selected, setSelected, shortcuts, setShortcuts, help, setHelp, nodes, select, keyDown } =
    navigation;

  const retry = useRef<(() => Promise<void>) | null>(null),
    dataRef = useRef(data),
    filterRef = useRef(filter);
  dataRef.current = data;
  filterRef.current = filter;
  const updateData = (next: DraftList | ((value: DraftList) => DraftList)) => {
    const value = typeof next === "function" ? next(dataRef.current) : next;
    dataRef.current = value;
    rawSetData(value);
  };
  const setFailure = (problem: unknown, again: () => Promise<void>) => {
    setError(problem instanceof Error ? problem.message : "Impossible de traiter la demande.");
    retry.current = again;
  };
  const refresh = async (target = 50, status = filterRef.current) => {
    const value = await loadDraftPrefix(document.id, status, target);
    if (mounted.current) updateData(value);
  };
  const refreshDecks = async () => {
    const items = await listDecks();
    if (mounted.current) {
      setDecks(items);
      setDeckId((current) => current || items[0]?.id || "");
    }
  };
  useEffect(() => {
    mounted.current = true;
    lock.current = true;
    setBusy(true);
    const initialize = async () => {
      await Promise.all([refresh(), refreshDecks()]);
    };
    void initialize()
      .catch((e) => {
        if (mounted.current) setFailure(e, initialize);
      })
      .finally(() => {
        lock.current = false;
        if (mounted.current) setBusy(false);
      });
    return () => {
      mounted.current = false;
    };
  }, [document.id]); // Component is keyed by document ID.
  const perform = async (task: () => Promise<void>, again = task) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    retry.current = null;
    try {
      await task();
    } catch (e) {
      if (mounted.current) setFailure(e, again);
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const changeFilter = (status: DraftStatus | "") => {
    if (lock.current) return;
    setFilter(status);
    filterRef.current = status;
    setSelected(new Set());
    setEditing(null);
    void perform(() => refresh(50, status));
  };
  const applyDraft = (draft: Draft, previousStatus?: DraftStatus) =>
    updateData((current) => {
      const existing = current.drafts.find((d) => d.id === draft.id);
      const old =
        existing ||
        (previousStatus ? { ...draft, status: previousStatus, faithfulToCourse: false } : null);
      if (!old) return current;
      const counts = { ...current.counts };
      counts[old.status]--;
      counts[draft.status]++;
      counts.faithfulToCourse += Number(draft.faithfulToCourse) - Number(old.faithfulToCourse);
      const keep = !filterRef.current || draft.status === filterRef.current;
      const drafts = keep
        ? existing
          ? current.drafts.map((d) => (d.id === draft.id ? draft : d))
          : [...current.drafts, draft].sort(
              (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
            )
        : current.drafts.filter((d) => d.id !== draft.id);
      return {
        ...current,
        counts,
        drafts,
        filteredTotal: current.filteredTotal + (existing ? (keep ? 0 : -1) : keep ? 1 : 0),
      };
    });
  // Optimistically remove status changes from the filtered list; keep a snapshot
  // per request, so a failed request rolls back only its own chunk.
  const optimistic = (ids: string[], action: DraftAction) =>
    updateData((current) => {
      const changed = current.drafts.map((d) =>
        ids.includes(d.id)
          ? {
              ...d,
              status: (action === "accept"
                ? "accepted"
                : action === "reject"
                  ? "rejected"
                  : d.rejectedFrom || "pending") as DraftStatus,
            }
          : d,
      );
      return {
        ...current,
        drafts: changed.filter((d) => !filterRef.current || d.status === filterRef.current),
      };
    });
  const batch = useSequentialDraftBatches({
    documentId: document.id,
    deckId,
    dataRef,
    lock,
    retry,
    nodes,
    updateData,
    applyDraft,
    optimistic,
    perform,
    setFailure,
    setResults,
    setSelected,
    setUndo,
    setProgress,
    setError,
    setMessage,
  });
  const save = (draft: Draft, type: NoteType, fields: Record<string, unknown>) =>
    void perform(async () => {
      const snapshot = dataRef.current;
      const optimisticDraft = {
        ...draft,
        noteType: type,
        front: String(fields.front || fields.text || ""),
        back: String(fields.back || fields.answer || ""),
        fields,
        status: draft.status,
        faithfulToCourse: false,
      };
      applyDraft(optimisticDraft);
      try {
        const response = await patchDraft(draft.id, type, fields);
        updateData(snapshot);
        applyDraft(response.draft);
        setEditing(null);
        setSelected((current) => new Set([...current].filter((id) => id !== draft.id)));
        setMessage("Modification enregistrée.");
      } catch (e) {
        updateData(snapshot);
        throw e;
      }
    });
  const selectAll = () =>
    void perform(async () => {
      const value = await loadDraftPrefix(document.id, filter, data.filteredTotal || 50);
      updateData(value);
      setSelected(new Set(value.drafts.filter((d) => d.status !== "accepted").map((d) => d.id)));
    });
  const generate = (options: GenerationOptions) =>
    void perform(async () => {
      const result = await generateDocumentDrafts(document.id, options);
      const messages = [];
      if (result.generated === 0)
        messages.push("Aucun brouillon généré, ce cours contient peu de phrases exploitables.");
      if (result.created) messages.push(`${result.created} brouillons générés, à réviser.`);
      if (result.ignored) messages.push(`${result.ignored} brouillons ignorés car déjà générés.`);
      if (result.unattributed)
        messages.push(
          `${result.unattributed} brouillons sans preuve attribuable n’ont pas été conservés.`,
        );
      setMessage(messages.join(" "));
      setShowGeneration(false);
      setFilter("pending");
      filterRef.current = "pending";
      setSelected(new Set());
      await refresh(50, "pending");
    });
  const closeViewer = () => {
    setViewer(null);
    requestAnimationFrame(() => opener.current?.focus());
  };
  const addDeck = () =>
    void perform(async () => {
      const deck = await createDeck({ name: deckName });
      setDecks((items) => [deck, ...items]);
      setDeckId(deck.id);
      setDeckName("");
    });
  const retryFailure = () => {
    const task = retry.current;
    if (task)
      void perform(async () => {
        try {
          await task();
        } catch (e) {
          const remaining = retry.current;
          setFailure(e, remaining || task);
        }
      });
  };
  return {
    data,
    filter,
    selected,
    editing,
    busy,
    error,
    message,
    showGeneration,
    shortcuts,
    help,
    decks,
    deckId,
    deckName,
    progress,
    results,
    undo,
    viewer,
    setShowGeneration,
    setShortcuts,
    setHelp,
    setDeckId,
    setDeckName,
    setSelected,
    setEditing,
    setUndo,
    changeFilter,
    selectAll,
    generate,
    batch,
    save,
    select,
    keyDown,
    closeViewer,
    addDeck,
    retryFailure,
    canRetry: Boolean(retry.current),
    loadMore: () => void perform(() => refresh(data.drafts.length + 50)),
    viewSource: (draft: Draft, button: HTMLButtonElement) => {
      opener.current = button;
      setViewer(draft);
    },
    focusDraft: navigation.focusDraft,
    registerDraft: navigation.registerDraft,
    cancelEditing: navigation.cancelEditing,
  };
}
export type DraftReview = ReturnType<typeof useDraftReview>;

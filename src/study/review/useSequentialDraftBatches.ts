import type { Dispatch, RefObject, SetStateAction } from "react";
import { actOnDrafts } from "./api";
import type { ActionResult, Draft, DraftList, DraftStatus } from "./api";
export type DraftAction = "accept" | "reject" | "restore";
type Setter<T> = Dispatch<SetStateAction<T>>;
type BatchContext = {
  documentId: string;
  deckId: string;
  dataRef: RefObject<DraftList>;
  lock: RefObject<boolean>;
  retry: RefObject<(() => Promise<void>) | null>;
  nodes: RefObject<Map<string, HTMLElement>>;
  updateData: (value: DraftList) => void;
  applyDraft: (draft: Draft, previousStatus?: DraftStatus) => void;
  optimistic: (ids: string[], action: DraftAction) => void;
  perform: (task: () => Promise<void>, again?: () => Promise<void>) => Promise<void>;
  setFailure: (problem: unknown, again: () => Promise<void>) => void;
  setResults: Setter<Record<string, ActionResult>>;
  setSelected: Setter<Set<string>>;
  setUndo: Setter<string[]>;
  setProgress: Setter<string>;
  setError: Setter<string>;
  setMessage: Setter<string>;
};
export function useSequentialDraftBatches(context: BatchContext) {
  const {
    documentId,
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
  } = context;
  const runBatch = async (action: DraftAction, ids: string[], done = 0, total = ids.length) => {
    if (action === "accept" && !deckId)
      throw new Error("Choisissez ou créez un deck de destination.");
    const rejected: string[] = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const chunk = ids.slice(offset, offset + 100),
        snapshot = dataRef.current;
      optimistic(chunk, action);
      let response: {
        results: ActionResult[];
      };
      try {
        response = await actOnDrafts(documentId, action, chunk, deckId);
      } catch (e) {
        updateData(snapshot);
        retry.current = () => runBatch(action, ids.slice(offset), done + offset, total);
        throw e;
      }
      // Reconcile from the pre-request snapshot, including individual failures.
      updateData(snapshot);
      setResults((current) => ({
        ...current,
        ...Object.fromEntries(response.results.map((r) => [r.id, r])),
      }));
      const successful = new Set<string>();
      for (const result of response.results) {
        if (result.draft) {
          applyDraft(result.draft, action === "restore" ? "rejected" : undefined);
          successful.add(result.id);
          if (result.status === "rejected") rejected.push(result.id);
        }
      }
      setSelected((current) => new Set([...current].filter((id) => !successful.has(id))));
      if (action === "restore") setUndo((current) => current.filter((id) => !successful.has(id)));
      setProgress(`${done + offset + chunk.length}/${total}`);
      const failed = response.results.filter(
        (r) => r.status === "invalid" || r.status === "not_found",
      );
      if (failed.length) setError(failed.map((r) => r.error || "Brouillon introuvable.").join(" "));
      if (rejected.length) setUndo((current) => [...new Set([...current, ...rejected])]);
    }
    requestAnimationFrame(() => {
      if (globalThis.document.activeElement === globalThis.document.body) {
        const next = dataRef.current.drafts[0];
        if (next) nodes.current.get(next.id)?.focus();
      }
    });
    setMessage(
      action === "accept"
        ? "Acceptation terminée."
        : action === "reject"
          ? "Rejeté. Annuler."
          : "Brouillons restaurés.",
    );
  };
  const batch = (action: DraftAction, ids: string[]) => {
    if (!ids.length || lock.current) return;
    setProgress(`0/${ids.length}`);
    // Preserve the retry closure for the uncompleted suffix on a network error.
    void perform(async () => {
      try {
        await runBatch(action, ids);
      } catch (e) {
        const remaining = retry.current;
        setFailure(e, remaining || (() => runBatch(action, ids)));
      }
    });
  };
  return batch;
}

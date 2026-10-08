import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { DraftList } from "./api";
import type { DraftAction } from "./useSequentialDraftBatches";

type NavigationOptions = {
  data: DraftList;
  busy: boolean;
  editing: string | null;
  viewerOpen: boolean;
  setEditing: (id: string | null) => void;
  onBatch: (action: DraftAction, ids: string[]) => void;
};
export function useReviewListNavigation({
  data,
  busy,
  editing,
  viewerOpen,
  setEditing,
  onBatch,
}: NavigationOptions) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shortcuts, setShortcuts] = useState(true);
  const [help, setHelp] = useState(false);
  const active = useRef<string | null>(null);
  const anchor = useRef<string | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const select = (id: string, shift: boolean) => {
    const ids = data.drafts.map((d) => d.id),
      start = anchor.current ? ids.indexOf(anchor.current) : -1,
      end = ids.indexOf(id);
    setSelected((current) => {
      const next = new Set(current);
      if (shift && start >= 0) {
        for (const item of ids.slice(Math.min(start, end), Math.max(start, end) + 1))
          next.add(item);
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    anchor.current = id;
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (
      !shortcuts ||
      busy ||
      editing ||
      viewerOpen ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      target.closest('input,textarea,select,[contenteditable],[data-review-editor],[role="dialog"]')
    )
      return;
    const key = event.key.toLowerCase(),
      draft = data.drafts.find((d) => d.id === active.current);
    if (key === "?") {
      event.preventDefault();
      setHelp((value) => !value);
      return;
    }
    if (key === "arrowdown" || key === "arrowup") {
      event.preventDefault();
      const index = data.drafts.findIndex((d) => d.id === active.current),
        next =
          data.drafts[
            Math.max(0, Math.min(data.drafts.length - 1, index + (key === "arrowdown" ? 1 : -1)))
          ];
      if (next) nodes.current.get(next.id)?.focus();
      return;
    }
    if (!draft) return;
    if (key === "e" && draft.status !== "accepted") {
      event.preventDefault();
      setEditing(draft.id);
    }
    if (key === "a" && ["pending", "edited"].includes(draft.status)) {
      event.preventDefault();
      onBatch("accept", [draft.id]);
    }
    if (key === "r" && ["pending", "edited"].includes(draft.status)) {
      event.preventDefault();
      onBatch("reject", [draft.id]);
    }
  };
  return {
    selected,
    setSelected,
    shortcuts,
    setShortcuts,
    help,
    setHelp,
    nodes,
    select,
    keyDown,
    focusDraft: (id: string) => {
      active.current = id;
    },
    registerDraft: (id: string, node: HTMLElement | null) => {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    },
    cancelEditing: (id: string) => {
      setEditing(null);
      nodes.current.get(id)?.focus();
    },
  };
}

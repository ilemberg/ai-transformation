"use client";

import { useEffect, useRef, useState } from "react";
import { GADGET_LIST, type GadgetId } from "../gadgets";

type Props = {
  open: boolean;
  onClose: () => void;
  isAdded: (id: GadgetId) => boolean;
  onAdd: (id: GadgetId) => void;
};

/**
 * Jira's "Add a gadget" dialog. A native modal <dialog>: the browser traps
 * focus, makes the page behind it inert and closes it on Escape.
 */
export function AddGadgetDialog({ open, onClose, isAdded, onAdd }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      searchRef.current?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  // Every way out goes through the parent's state; the effect above then
  // closes the native dialog. Escape is caught on "cancel" for the same reason.
  function close() {
    setQuery("");
    setStatus("");
    onClose();
  }

  const q = query.trim().toLowerCase();
  const shown = GADGET_LIST.filter((g) => !q || `${g.title} ${g.description}`.toLowerCase().includes(q));

  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby="add-gadget-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={() => {
        // Only when something else closed it; a late event from our own close() is ignored.
        if (open && !ref.current?.open) close();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto w-[min(600px,calc(100vw-32px))] max-h-[min(640px,calc(100dvh-32px))] overflow-hidden rounded-[3px] border-0 bg-panel p-0 text-ink shadow-raised backdrop:bg-black/50"
    >
      <div className="flex max-h-[min(640px,calc(100dvh-32px))] flex-col">
        <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-5">
          <h2 id="add-gadget-title" className="text-xl font-medium">
            Add a gadget
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="grid h-8 w-8 place-items-center rounded-[3px] text-dim hover:bg-hover"
          >
            <span aria-hidden className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>
        <div className="px-6 pb-3">
          <label htmlFor="gadget-search" className="sr-only">
            Search gadgets
          </label>
          <input
            ref={searchRef}
            id="gadget-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search gadgets"
            className="h-9 w-full rounded-[3px] border-2 border-edge bg-panel-2 px-2 text-sm placeholder:text-faint focus:border-brand focus:bg-panel focus:outline-none"
          />
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-edge overflow-y-auto border-y border-edge px-6">
          {shown.map((g) => {
            const added = isAdded(g.id);
            return (
              <li key={g.id} className="flex items-center gap-3 py-3">
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[3px] bg-info-bg text-xs font-bold text-info-text"
                >
                  {g.defaultWidth === 2 ? "▦" : "▤"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{g.title}</div>
                  <div className="text-xs text-dim">{g.description}</div>
                </div>
                <button
                  type="button"
                  aria-disabled={added}
                  aria-label={added ? `${g.title} added` : `Add ${g.title}`}
                  onClick={() => {
                    if (added) return;
                    onAdd(g.id);
                    setStatus(`${g.title} added to the dashboard.`);
                  }}
                  className={`h-8 shrink-0 rounded-[3px] px-3 text-sm font-medium ${
                    added ? "cursor-not-allowed bg-neutral-bg text-faint" : "bg-neutral-bg text-ink hover:bg-edge"
                  }`}
                >
                  {added ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
          {shown.length === 0 && <li className="py-6 text-center text-sm text-dim">No gadgets match “{query}”.</li>}
        </ul>
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <p aria-live="polite" className="min-w-0 truncate text-xs text-dim">
            {status || "All gadgets show sample data."}
          </p>
          <button
            type="button"
            onClick={close}
            className="h-8 shrink-0 rounded-[3px] bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

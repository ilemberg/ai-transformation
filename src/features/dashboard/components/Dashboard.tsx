"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { DEFAULT_LAYOUT, GADGET_IDS, GADGETS, STORAGE_KEY, isGadgetId, type GadgetId } from "../gadgets";
import {
  addGadget,
  has,
  isNoopInsertion,
  moveBy,
  moveToInsertion,
  removeGadget,
  resetLayout,
  sameLayout,
  toggleWidth,
  type Layout,
} from "../layout";
import { browserStorage, createLayoutStore } from "../store";
import { AddGadgetDialog } from "./AddGadgetDialog";
import { GADGET_BODIES } from "./GadgetBodies";
import { GadgetFrame } from "./GadgetFrame";

const store = createLayoutStore({
  key: STORAGE_KEY,
  known: GADGET_IDS,
  defaults: DEFAULT_LAYOUT,
  storage: browserStorage,
});

type Drag = { from: number; insertAt: number | null };

const button = "inline-flex h-8 items-center rounded-[3px] px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";
const neutral = `${button} bg-neutral-bg text-ink hover:bg-edge`;
const primary = `${button} bg-brand text-white hover:bg-brand-hover`;

/** Focus the first usable element by id once React has committed the reordered DOM. */
function focusLater(...ids: string[]) {
  setTimeout(() => {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el && !(el as HTMLButtonElement).disabled) {
        el.focus();
        return;
      }
    }
  }, 0);
}

export function Dashboard() {
  const layout = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const slots = layout.filter((s): s is { id: GadgetId; width: 1 | 2 } => isGadgetId(s.id));
  const title = (id: string) => (isGadgetId(id) ? GADGETS[id].title : id);

  function update(next: Layout, message: string) {
    if (next === layout) return;
    store.set(next);
    setAnnouncement(message);
  }

  function move(id: GadgetId, step: -1 | 1) {
    const next = moveBy(layout, id, step);
    const pos = next.findIndex((s) => s.id === id);
    update(next, `${title(id)} moved to position ${pos + 1} of ${next.length}.`);
    focusLater(step === -1 ? `move-prev-${id}` : `move-next-${id}`, step === -1 ? `move-next-${id}` : `move-prev-${id}`);
  }

  function remove(id: GadgetId) {
    const at = layout.findIndex((s) => s.id === id);
    const next = removeGadget(layout, id);
    update(next, `${title(id)} removed.`);
    const neighbour = next[Math.min(at, next.length - 1)];
    setTimeout(() => {
      const target = neighbour
        ? document.querySelector<HTMLElement>(`[data-gadget="${neighbour.id}"] button[aria-haspopup="menu"]`)
        : null;
      (target ?? addButtonRef.current)?.focus();
    }, 0);
  }

  function toggle(id: GadgetId) {
    const next = toggleWidth(layout, id);
    const w = next.find((s) => s.id === id)?.width;
    update(next, `${title(id)} is now ${w === 2 ? "two columns" : "one column"} wide.`);
  }

  function add(id: GadgetId) {
    update(addGadget(layout, id, GADGETS[id].defaultWidth), `${title(id)} added at the end of the dashboard.`);
  }

  function reset() {
    update(resetLayout(DEFAULT_LAYOUT), "Layout reset to the default.");
  }

  function onDragOverCard(e: React.DragEvent, index: number) {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const r = e.currentTarget.getBoundingClientRect();
    // Split the card on its diagonal: top-left half drops before it, bottom-right after.
    // Works for side-by-side cards and for a single stacked column.
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    const insertAt = fx + fy < 1 ? index : index + 1;
    if (insertAt !== drag.insertAt) setDrag({ ...drag, insertAt });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (drag && drag.insertAt !== null) {
      const id = layout[drag.from]?.id ?? "";
      const next = moveToInsertion(layout, drag.from, drag.insertAt);
      const pos = next.findIndex((s) => s.id === id);
      update(next, `${title(id)} moved to position ${pos + 1} of ${next.length}.`);
    }
    setDrag(null);
  }

  const dragged = drag ? slots[drag.from] : undefined;
  const showPlaceholder = drag !== null && drag.insertAt !== null && !isNoopInsertion(drag.from, drag.insertAt);
  const placeholder = (
    <div
      key="__drop"
      aria-hidden
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      className={`min-h-32 rounded-[3px] border-2 border-dashed border-brand bg-selected ${dragged?.width === 2 ? "md:col-span-2" : ""}`}
    />
  );

  const items: React.ReactNode[] = [];
  slots.forEach((slot, i) => {
    if (showPlaceholder && drag?.insertAt === i) items.push(placeholder);
    const info = GADGETS[slot.id];
    const Body = GADGET_BODIES[slot.id];
    items.push(
      <GadgetFrame
        key={slot.id}
        info={info}
        width={slot.width}
        index={i}
        count={slots.length}
        editing={editing}
        dragging={drag?.from === i}
        onMove={(step) => move(slot.id, step)}
        onToggleWidth={() => toggle(slot.id)}
        onRemove={() => remove(slot.id)}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", slot.id);
          setDrag({ from: i, insertAt: null });
        }}
        onDragEnd={() => setDrag(null)}
        onDragOver={(e) => onDragOverCard(e, i)}
      >
        <Body />
      </GadgetFrame>,
    );
  });
  if (showPlaceholder && drag?.insertAt === slots.length) items.push(placeholder);

  const isDefault = sameLayout(layout, DEFAULT_LAYOUT);

  return (
    <>
      <div className="mb-4 mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium">Stakeholder dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          {editing && (
            <button type="button" className={neutral} onClick={reset} disabled={isDefault}>
              Reset layout
            </button>
          )}
          <button ref={addButtonRef} type="button" className={neutral} onClick={() => setAdding(true)} aria-haspopup="dialog">
            Add gadget
          </button>
          <button
            type="button"
            className={editing ? primary : neutral}
            aria-pressed={editing}
            onClick={() => {
              setEditing((v) => !v);
              setDrag(null);
              setAnnouncement(editing ? "Edit mode off." : "Edit mode on. Drag gadgets, or use the move buttons.");
            }}
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {editing && (
        <p className="mb-3 rounded-[3px] bg-info-bg px-3 py-2 text-sm text-info-text">
          Editing layout: drag a gadget to a new place, or use its arrow buttons. Your layout is saved in this browser only.
        </p>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {slots.length === 0 ? (
        <div className="grid place-items-center gap-3 rounded-[3px] border-2 border-dashed border-edge-2 px-4 py-16 text-center">
          <p className="text-dim">This dashboard has no gadgets.</p>
          <button type="button" className={primary} onClick={() => setAdding(true)}>
            Add gadget
          </button>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          onDragOver={(e) => {
            if (drag) e.preventDefault();
          }}
          onDrop={onDrop}
        >
          {items}
        </div>
      )}

      <AddGadgetDialog
        open={adding}
        onClose={() => {
          setAdding(false);
          setTimeout(() => addButtonRef.current?.focus(), 0);
        }}
        isAdded={(id) => has(layout, id)}
        onAdd={add}
      />
    </>
  );
}

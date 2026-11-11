/*
 * Pure layout logic for the stakeholder dashboard: which gadgets are on it,
 * in what order, and how wide each one is. Every function returns a new
 * layout and leaves its input alone.
 */

export type Width = 1 | 2;

export type Slot = { id: string; width: Width };

export type Layout = readonly Slot[];

export function indexOf(layout: Layout, id: string): number {
  return layout.findIndex((s) => s.id === id);
}

export function has(layout: Layout, id: string): boolean {
  return indexOf(layout, id) !== -1;
}

/** Appends a gadget at the end. A gadget already on the dashboard is not added twice. */
export function addGadget(layout: Layout, id: string, width: Width = 1): Layout {
  if (has(layout, id)) return layout;
  return [...layout, { id, width }];
}

export function removeGadget(layout: Layout, id: string): Layout {
  return layout.filter((s) => s.id !== id);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Moves the gadget at `from` so it ends up at index `to` (clamped to the layout). */
export function moveGadget(layout: Layout, from: number, to: number): Layout {
  if (!Number.isInteger(from) || from < 0 || from >= layout.length) return layout;
  const target = clamp(Number.isFinite(to) ? Math.round(to) : from, 0, layout.length - 1);
  if (target === from) return layout;
  const next = [...layout];
  const [slot] = next.splice(from, 1);
  next.splice(target, 0, slot);
  return next;
}

/** Moves a gadget one or more places earlier (negative) or later (positive). */
export function moveBy(layout: Layout, id: string, step: number): Layout {
  const from = indexOf(layout, id);
  if (from === -1) return layout;
  return moveGadget(layout, from, from + step);
}

/**
 * Drag and drop works with insertion points: 0 is before the first gadget,
 * `layout.length` after the last. Dropping just before or after the dragged
 * gadget leaves the layout as it was.
 */
export function moveToInsertion(layout: Layout, from: number, insertAt: number): Layout {
  const at = clamp(insertAt, 0, layout.length);
  return moveGadget(layout, from, at > from ? at - 1 : at);
}

/** True when dropping the gadget at `from` on insertion point `insertAt` would change nothing. */
export function isNoopInsertion(from: number, insertAt: number): boolean {
  return insertAt === from || insertAt === from + 1;
}

export function setWidth(layout: Layout, id: string, width: Width): Layout {
  if (!has(layout, id)) return layout;
  return layout.map((s) => (s.id === id ? { ...s, width } : s));
}

export function toggleWidth(layout: Layout, id: string): Layout {
  const slot = layout.find((s) => s.id === id);
  if (!slot) return layout;
  return setWidth(layout, id, slot.width === 1 ? 2 : 1);
}

/** A fresh copy of the default layout. */
export function resetLayout(defaults: Layout): Layout {
  return defaults.map((s) => ({ ...s }));
}

export function serializeLayout(layout: Layout): string {
  return JSON.stringify(layout.map(({ id, width }) => ({ id, width })));
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Reads a stored layout. Unknown ids and repeats are dropped, a missing or odd
 * width becomes 1. Anything unusable (no value, bad JSON, not a list, or a
 * list in which nothing is usable) gives the default layout. An empty list is
 * kept: the viewer removed every gadget.
 */
export function parseLayout(raw: string | null | undefined, known: readonly string[], defaults: Layout): Layout {
  if (raw == null || raw === "") return resetLayout(defaults);
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return resetLayout(defaults);
  }
  if (!Array.isArray(data)) return resetLayout(defaults);
  if (data.length === 0) return [];

  const knownSet = new Set(known);
  const seen = new Set<string>();
  const out: Slot[] = [];
  for (const item of data) {
    if (!isRecord(item)) continue;
    const id = item.id;
    if (typeof id !== "string" || !knownSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, width: item.width === 2 ? 2 : 1 });
  }
  return out.length === 0 ? resetLayout(defaults) : out;
}

export function sameLayout(a: Layout, b: Layout): boolean {
  return a.length === b.length && a.every((s, i) => s.id === b[i]?.id && s.width === b[i]?.width);
}

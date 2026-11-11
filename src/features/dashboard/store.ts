import { parseLayout, serializeLayout, type Layout } from "./layout";

/** The bits of Web Storage the store uses, so tests can pass a fake. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export type LayoutStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Layout;
  getServerSnapshot: () => Layout;
  set: (next: Layout) => void;
};

/**
 * A per-viewer layout kept in browser storage, read through
 * useSyncExternalStore: the server and the first client render use the
 * default layout, then React switches to the stored one. Storage is a
 * convenience only: every read and write is guarded, and a blocked or
 * broken storage leaves the dashboard working for this visit.
 */
export function createLayoutStore(opts: {
  key: string;
  known: readonly string[];
  defaults: Layout;
  storage: () => KeyValueStorage | null;
}): LayoutStore {
  const { key, known, defaults, storage } = opts;
  let current: Layout | null = null;
  const listeners = new Set<() => void>();

  function load(): Layout {
    let raw: string | null = null;
    try {
      raw = storage()?.getItem(key) ?? null;
    } catch {
      raw = null;
    }
    return parseLayout(raw, known, defaults);
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      if (current === null) current = load();
      return current;
    },
    getServerSnapshot() {
      return defaults;
    },
    set(next) {
      current = next;
      try {
        storage()?.setItem(key, serializeLayout(next));
      } catch {
        // Storage full or blocked: the layout still holds for this visit.
      }
      for (const l of listeners) l();
    },
  };
}

/** window.localStorage, or null where reading it throws or there is no window. */
export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

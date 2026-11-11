import { describe, expect, it, vi } from "vitest";
import type { Layout } from "./layout";
import { createLayoutStore, type KeyValueStorage } from "./store";

const DEFAULTS: Layout = [
  { id: "a", width: 1 },
  { id: "b", width: 2 },
];

function memory(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const make = (storage: () => KeyValueStorage | null) =>
  createLayoutStore({ key: "k", known: ["a", "b", "c"], defaults: DEFAULTS, storage });

describe("createLayoutStore", () => {
  it("serves the default layout to the server render", () => {
    const s = memory({ k: JSON.stringify([{ id: "c", width: 1 }]) });
    expect(make(() => s).getServerSnapshot()).toBe(DEFAULTS);
  });

  it("reads the stored layout once and returns the same object", () => {
    const s = memory({ k: JSON.stringify([{ id: "c", width: 1 }]) });
    const spy = vi.spyOn(s, "getItem");
    const store = make(() => s);
    const first = store.getSnapshot();
    expect(first).toEqual([{ id: "c", width: 1 }]);
    expect(store.getSnapshot()).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("writes, notifies and serves the new layout", () => {
    const s = memory();
    const store = make(() => s);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    const next: Layout = [{ id: "b", width: 1 }];
    store.set(next);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(next);
    expect(JSON.parse(s.data.k ?? "null")).toEqual(next);
    off();
    store.set(DEFAULTS);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("works with storage that throws or is missing", () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const store = make(() => broken);
    expect(store.getSnapshot()).toEqual(DEFAULTS);
    const next: Layout = [{ id: "c", width: 2 }];
    expect(() => store.set(next)).not.toThrow();
    expect(store.getSnapshot()).toBe(next);

    const none = make(() => null);
    expect(none.getSnapshot()).toEqual(DEFAULTS);
    expect(() => none.set(next)).not.toThrow();
  });
});

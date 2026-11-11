import { describe, expect, it } from "vitest";
import {
  addGadget,
  isNoopInsertion,
  moveBy,
  moveGadget,
  moveToInsertion,
  parseLayout,
  removeGadget,
  resetLayout,
  serializeLayout,
  setWidth,
  toggleWidth,
  type Layout,
} from "./layout";
import { DEFAULT_LAYOUT, GADGET_IDS, GADGETS, STORAGE_KEY, isGadgetId } from "./gadgets";

const L: Layout = [
  { id: "a", width: 2 },
  { id: "b", width: 1 },
  { id: "c", width: 1 },
];
const KNOWN = ["a", "b", "c", "d"];
const ids = (l: Layout) => l.map((s) => s.id).join("");

describe("addGadget", () => {
  it("appends at the end with the given width", () => {
    const next = addGadget(L, "d", 2);
    expect(ids(next)).toBe("abcd");
    expect(next[3]).toEqual({ id: "d", width: 2 });
    expect(ids(L)).toBe("abc");
  });

  it("does not add a gadget twice", () => {
    expect(addGadget(L, "b")).toBe(L);
  });
});

describe("removeGadget", () => {
  it("removes by id and ignores unknown ids", () => {
    expect(ids(removeGadget(L, "b"))).toBe("ac");
    expect(ids(removeGadget(L, "z"))).toBe("abc");
  });
});

describe("moveGadget", () => {
  it("moves by index", () => {
    expect(ids(moveGadget(L, 0, 2))).toBe("bca");
    expect(ids(moveGadget(L, 2, 0))).toBe("cab");
  });

  it("clamps the target", () => {
    expect(ids(moveGadget(L, 1, 99))).toBe("acb");
    expect(ids(moveGadget(L, 1, -5))).toBe("bac");
  });

  it("ignores a bad source index", () => {
    expect(moveGadget(L, 7, 0)).toBe(L);
    expect(moveGadget(L, -1, 0)).toBe(L);
  });

  it("moveBy steps from the gadget's place and stops at the ends", () => {
    expect(ids(moveBy(L, "b", -1))).toBe("bac");
    expect(ids(moveBy(L, "c", 1))).toBe("abc");
    expect(moveBy(L, "z", 1)).toBe(L);
  });
});

describe("moveToInsertion", () => {
  it("drops before the gadget at the insertion point", () => {
    expect(ids(moveToInsertion(L, 0, 2))).toBe("bac");
    expect(ids(moveToInsertion(L, 0, 3))).toBe("bca");
    expect(ids(moveToInsertion(L, 2, 0))).toBe("cab");
  });

  it("leaves the layout alone next to the gadget's own place", () => {
    expect(ids(moveToInsertion(L, 1, 1))).toBe("abc");
    expect(ids(moveToInsertion(L, 1, 2))).toBe("abc");
    expect(isNoopInsertion(1, 1)).toBe(true);
    expect(isNoopInsertion(1, 2)).toBe(true);
    expect(isNoopInsertion(1, 3)).toBe(false);
  });
});

describe("widths", () => {
  it("sets and toggles width", () => {
    expect(setWidth(L, "b", 2)[1]).toEqual({ id: "b", width: 2 });
    expect(toggleWidth(L, "a")[0]).toEqual({ id: "a", width: 1 });
    expect(toggleWidth(L, "z")).toBe(L);
  });
});

describe("resetLayout", () => {
  it("returns a copy of the defaults", () => {
    const r = resetLayout(L);
    expect(r).toEqual(L);
    expect(r).not.toBe(L);
    expect(r[0]).not.toBe(L[0]);
  });
});

describe("parseLayout", () => {
  it("round-trips a serialized layout", () => {
    expect(parseLayout(serializeLayout(L), KNOWN, [])).toEqual(L);
  });

  it("gives the default for nothing, bad JSON or a non-list", () => {
    for (const raw of [null, undefined, "", "{nope", '{"id":"a"}', "42", "null"]) {
      expect(parseLayout(raw, KNOWN, L)).toEqual(L);
    }
  });

  it("drops unknown ids and repeats, keeping the first", () => {
    const raw = JSON.stringify([
      { id: "b", width: 2 },
      { id: "zzz", width: 1 },
      { id: "b", width: 1 },
      { id: "a", width: 1 },
    ]);
    expect(parseLayout(raw, KNOWN, L)).toEqual([
      { id: "b", width: 2 },
      { id: "a", width: 1 },
    ]);
  });

  it("turns an odd width into 1 and skips malformed items", () => {
    const raw = JSON.stringify([{ id: "a", width: 3 }, "c", null, { width: 2 }, { id: 4 }]);
    expect(parseLayout(raw, KNOWN, L)).toEqual([{ id: "a", width: 1 }]);
  });

  it("gives the default when nothing in the list is usable", () => {
    expect(parseLayout(JSON.stringify([{ id: "x" }, { id: "y" }]), KNOWN, L)).toEqual(L);
  });

  it("keeps an empty list: every gadget was removed", () => {
    expect(parseLayout("[]", KNOWN, L)).toEqual([]);
  });
});

describe("the executive default layout", () => {
  it("is what is getting done, then spend, then one risk gadget", () => {
    expect(DEFAULT_LAYOUT.map((s) => s.id)).toEqual([
      "shipped",
      "requestToLive",
      "shippedPerEngineer",
      "velocity",
      "costPerTicket",
      "aiBudget",
      "payrollShare",
      "tokenSpend",
      "spendByTeam",
      "forecast",
      "risk",
    ]);
    const groups = DEFAULT_LAYOUT.map((s) => (isGadgetId(s.id) ? GADGETS[s.id].group : "unknown"));
    expect(groups.filter((g) => g === "risk")).toHaveLength(1);
    expect(groups).not.toContain("engineering");
  });

  it("uses each gadget's default width and fills every row of three columns", () => {
    for (const s of DEFAULT_LAYOUT) expect(s.width, s.id).toBe(isGadgetId(s.id) ? GADGETS[s.id].defaultWidth : 0);
    // Greedy placement in a three-column grid leaves no gaps.
    let col = 0;
    for (const s of DEFAULT_LAYOUT) {
      if (col + s.width > 3) throw new Error(`${s.id} leaves a gap`);
      col = (col + s.width) % 3;
    }
    expect(col).toBe(0);
  });

  it("keeps the engineering gadgets addable", () => {
    for (const id of ["rules", "adoption", "evals", "phase", "cycleTime", "errorBudget"] as const) {
      expect(GADGET_IDS).toContain(id);
      expect(GADGETS[id].group).toBe("engineering");
    }
  });

  it("is stored under a new key, so a layout saved before the change does not hide it", () => {
    expect(STORAGE_KEY).toBe("bookwell.dashboard.layout.v2");
    const v1 = JSON.stringify([{ id: "rules", width: 1 }]);
    // A v2 read of nothing gives the new default.
    expect(parseLayout(null, GADGET_IDS, DEFAULT_LAYOUT)).toEqual(DEFAULT_LAYOUT);
    // Old ids still parse if a visitor saves them again later.
    expect(parseLayout(v1, GADGET_IDS, DEFAULT_LAYOUT)).toEqual([{ id: "rules", width: 1 }]);
  });
});

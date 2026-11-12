import { describe, expect, it } from "vitest";
import { TICKETS } from "@/features/line/tickets";
import {
  ARCH_RULES,
  CHANGE_SIZE_POLICY,
  COMPREHENSION,
  COMPREHENSION_HISTORY,
  ITEMS,
  LAST_NIGHT,
  NIGHTS,
  SWEEP_LOG,
  TASKS,
  TICKET_BOARD_ID,
  ticketHref,
  type TicketKey,
} from "./data";
import { countByKind, filterItems, formatDate, latest, passRateTrend, sizeCap, sortHistory, taskTotals, tierFor } from "./logic";

describe("sortHistory", () => {
  it("puts the newest change first and breaks date ties by version", () => {
    const out = sortHistory([
      { version: "v1", date: "2026-01-01", author: "engineer", team: "x", reason: "a" },
      { version: "v3", date: "2026-03-01", author: "engineer", team: "x", reason: "c" },
      { version: "v2", date: "2026-03-01", author: "engineer", team: "x", reason: "b" },
    ]);
    expect(out.map((c) => c.version)).toEqual(["v3", "v2", "v1"]);
  });

  it("does not change the input", () => {
    const h = [
      { version: "v1", date: "2026-01-01", author: "engineer" as const, team: "x", reason: "a" },
      { version: "v2", date: "2026-02-01", author: "engineer" as const, team: "x", reason: "b" },
    ];
    sortHistory(h);
    expect(h[0]!.version).toBe("v1");
  });
});

describe("inventory data", () => {
  it("has unique ids and every item has a history no later than today", () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const i of ITEMS) {
      expect(i.history.length).toBeGreaterThan(0);
      for (const c of i.history) expect(c.date <= "2026-11-11").toBe(true);
    }
  });

  it("links the ticket that drove an item's newest change", () => {
    for (const i of ITEMS.filter((x) => x.because)) {
      expect(i.history.some((c) => c.ticket === i.because)).toBe(true);
    }
  });

  it("has the change-size v3 caps the board cites", () => {
    expect(CHANGE_SIZE_POLICY.caps).toEqual({ low: 600, standard: 400, high: 250 });
    const cs = ITEMS.find((i) => i.name === "change-size")!;
    expect(latest(cs).version).toBe("v3");
    expect(CHANGE_SIZE_POLICY.version).toBe(`change-size ${latest(cs).version}`);
  });

  it("marks only search/CONTEXT.md failing, matching last night's failed task", () => {
    expect(ITEMS.filter((i) => i.test === "fail").map((i) => i.name)).toEqual(["search/CONTEXT.md"]);
    expect(TASKS.filter((t) => !t.pass).map((t) => t.id)).toEqual(["H-07"]);
    expect(SWEEP_LOG.some((s) => s.item.startsWith("search/CONTEXT.md") && s.action === "Open")).toBe(true);
  });
});

describe("filterItems and countByKind", () => {
  it("filters by kind and failing", () => {
    expect(filterItems(ITEMS, { kind: "all", failingOnly: false })).toHaveLength(ITEMS.length);
    expect(filterItems(ITEMS, { kind: "eval", failingOnly: false }).map((i) => i.name)).toEqual(["rebooking-golden", "injection"]);
    expect(filterItems(ITEMS, { kind: "all", failingOnly: true })).toHaveLength(1);
    expect(filterItems(ITEMS, { kind: "policy", failingOnly: true })).toHaveLength(0);
  });

  it("counts every item once", () => {
    const c = countByKind(ITEMS);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(ITEMS.length);
    expect(c.policy).toBe(4);
  });
});

describe("harness tests", () => {
  it("turns nights into whole-percent pass rates", () => {
    expect(passRateTrend([{ date: "x", passed: 11, total: 12 }, { date: "y", passed: 12, total: 12 }, { date: "z", passed: 0, total: 0 }])).toEqual([92, 100, 0]);
  });

  it("has 14 nights ending last night, which matches the task table", () => {
    expect(NIGHTS).toHaveLength(14);
    const last = NIGHTS.at(-1)!;
    expect(last.date).toBe(LAST_NIGHT);
    const t = taskTotals(TASKS);
    expect([last.passed, last.total]).toEqual([t.passed, t.total]);
  });

  it("sums tokens and cost", () => {
    const t = taskTotals([
      { id: "a", task: "", expected: "", actual: "", pass: true, ktokens: 10, costUsd: 0.1 },
      { id: "b", task: "", expected: "", actual: "", pass: false, ktokens: 5, costUsd: 0.2 },
    ]);
    expect(t).toEqual({ passed: 1, total: 2, ktokens: 15, costUsd: 0.3 });
  });
});

describe("tierFor", () => {
  it("takes the highest tier touched", () => {
    expect(tierFor(["docs", "copy"])).toBe("low");
    expect(tierFor(["product"])).toBe("standard");
    expect(tierFor(["docs", "money"])).toBe("high");
    expect(tierFor(["ai"])).toBe("high");
    expect(tierFor([])).toBe("standard");
  });

  it("maps tiers to change-size v3 caps", () => {
    expect([sizeCap("low"), sizeCap("standard"), sizeCap("high")]).toEqual([600, 400, 250]);
  });
});

describe("links and counts", () => {
  it("points each ticket key at the board ticket with that key", () => {
    for (const [key, id] of Object.entries(TICKET_BOARD_ID)) {
      expect(TICKETS.find((t) => t.id === id)?.key).toBe(key);
      expect(ticketHref(key as TicketKey)).toBe(`/?t=${id}`);
    }
  });

  it("agrees with itself on comprehension and rule ids", () => {
    const q = COMPREHENSION_HISTORY.at(-1)!;
    expect(COMPREHENSION).toHaveLength(q.total);
    expect(COMPREHENSION.filter((s) => s.passed)).toHaveLength(q.passed);
    expect(new Set(ARCH_RULES.map((r) => r.id)).size).toBe(ARCH_RULES.length);
  });

  it("formats dates", () => {
    expect(formatDate("2026-11-10")).toBe("10 Nov 2026");
    expect(formatDate("2026-05-04", true)).toBe("4 May");
  });
});

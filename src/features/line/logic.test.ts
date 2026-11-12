import { describe, expect, it } from "vitest";
import {
  assigneeAt,
  describeChange,
  formatMinutes,
  formatUsd,
  isFinished,
  jumpTo,
  jumpToStation,
  lastStep,
  parseLocation,
  START,
  stationOf,
  stepAt,
  stepOne,
  testState,
  testTally,
  tick,
  tierShares,
  totalsAt,
  totalsFor,
  turnOrder,
  type Cursor,
} from "./logic";
import { ACTORS, STATIONS } from "./stations";
import { TICKETS } from "./tickets";
import { TOUR, TOUR_STOP_MS } from "./tour";
import { TRACE_IDS } from "@/features/observe/data";
import { STATION_IDS } from "./types";

const byId = (id: string) => TICKETS.find((t) => t.id === id)!;
const feature = byId("feature");
const bug = byId("bug");
const upgrade = byId("upgrade");

function playToEnd(ticket = feature): Cursor[] {
  const seen: Cursor[] = [];
  let c: Cursor | null = START;
  while (c) {
    seen.push(c);
    c = tick(ticket, c);
    if (seen.length > 1000) throw new Error("playback never ended");
  }
  return seen;
}

describe("content", () => {
  it("has one station per id, in order, each with a brief", () => {
    expect(STATIONS.map((s) => s.id)).toEqual([...STATION_IDS]);
    for (const s of STATIONS) expect(s.brief.length).toBeGreaterThan(20);
  });

  it("starts every route at Intake, ends it at the bug loop, and visits every station", () => {
    for (const ticket of TICKETS) {
      expect(ticket.steps[0].station).toBe("intake");
      expect(ticket.steps.at(-1)!.station).toBe("learn");
      expect(new Set(ticket.steps.map((s) => s.station))).toEqual(new Set(STATION_IDS));
    }
  });

  it("only moves forward, except where a gate sends a ticket back to Build", () => {
    for (const ticket of TICKETS) {
      for (let i = 1; i < ticket.steps.length; i++) {
        const from = STATION_IDS.indexOf(ticket.steps[i - 1].station);
        const to = STATION_IDS.indexOf(ticket.steps[i].station);
        if (to < from) expect(ticket.steps[i].station).toBe("build");
        else expect(to).toBeGreaterThan(from);
      }
    }
  });

  it("only links to traces that exist on the Observe page", () => {
    const linked = TICKETS.flatMap((t) => t.steps.flatMap((s) => s.log.flatMap((l) => (l.trace ? [l.trace] : []))));
    expect(linked.length).toBeGreaterThan(0);
    for (const id of linked) expect(TRACE_IDS).toContain(id);
  });

  it("only names actors that exist", () => {
    for (const ticket of TICKETS) {
      for (const step of ticket.steps) {
        for (const line of step.log) expect(ACTORS[line.who]).toBeDefined();
      }
    }
  });

  it("explains every light or skipped step", () => {
    for (const ticket of TICKETS) {
      for (const step of ticket.steps) {
        if (step.mode !== "full") expect(step.reason).toBeTruthy();
      }
    }
  });

  it("keeps a feature ticket's model spend in a believable range", () => {
    for (const ticket of TICKETS) {
      const usd = totalsFor(ticket).aiUsd;
      expect(usd).toBeGreaterThan(3);
      expect(usd).toBeLessThan(150);
    }
  });
});

describe("playback", () => {
  it("reveals lines one at a time, then moves to the next step", () => {
    const first = stepAt(feature, 0).log.length;
    let cursor = START;
    for (let i = 0; i < first; i++) cursor = tick(feature, cursor)!;
    expect(cursor).toEqual({ step: 0, shown: first });
    expect(tick(feature, cursor)).toEqual({ step: 1, shown: 0 });
  });

  it("stops at the end of the last step", () => {
    expect(isFinished(bug, playToEnd(bug).at(-1)!)).toBe(true);
  });

  it("clamps jumps to the route", () => {
    expect(jumpTo(feature, -3).step).toBe(0);
    expect(jumpTo(feature, 99).step).toBe(lastStep(feature));
  });

  it("jumps to the first visit of a station", () => {
    const c = jumpToStation(upgrade, STATION_IDS.indexOf("build"))!;
    expect(c.step).toBe(3);
  });
});

describe("the ticket that gets stopped", () => {
  const route = upgrade.steps.map((s) => s.station);

  it("goes back to Build twice: once from the gates, once from a rollback", () => {
    const backs = route.flatMap((s, i) => (i > 0 && STATION_IDS.indexOf(s) < STATION_IDS.indexOf(route[i - 1]) ? [route[i - 1]] : []));
    expect(backs).toEqual(["gates", "release"]);
  });

  it("turns evals red at the failed gate and green at the next one", () => {
    const firstGate = route.indexOf("gates");
    const secondGate = route.indexOf("gates", firstGate + 1);
    expect(testState(upgrade, "evals", jumpTo(upgrade, firstGate))).toBe("red");
    expect(testState(upgrade, "evals", jumpTo(upgrade, secondGate))).toBe("green");
  });

  it("counts the eval cases that passed when the suite fails, and marks the suite blocking", () => {
    const failedGate = route.indexOf("gates");
    const t = testTally(upgrade, "evals", jumpTo(upgrade, failedGate));
    expect(t).toEqual({ state: "red", passing: 143, failing: 17, blocking: true });
    const total = (Object.keys(upgrade.tests) as (keyof typeof upgrade.tests)[]).reduce(
      (n, k) => n + testTally(upgrade, k, jumpTo(upgrade, failedGate)).passing,
      0,
    );
    expect(total).toBe(153);
  });

  it("turns the load test red when the canary rolls back, and green after the fix", () => {
    const rollback = route.indexOf("release");
    expect(testState(upgrade, "load", jumpTo(upgrade, rollback - 1))).toBe("green");
    expect(testState(upgrade, "load", jumpTo(upgrade, rollback))).toBe("red");
    expect(testState(upgrade, "load", jumpTo(upgrade, lastStep(upgrade)))).toBe("green");
  });

  it("reports the move back as a backwards move", () => {
    const failedGate = route.indexOf("gates");
    const before = jumpTo(upgrade, failedGate);
    const ev = describeChange(upgrade, before, { step: failedGate + 1, shown: 0 }, 1);
    expect(ev.moved).toBe(true);
    expect(ev.movedBack).toBe(true);
    expect(stationOf(upgrade, ev.after)).toBe(STATION_IDS.indexOf("build"));
  });

  it("has a person take over when the coding agent runs out of budget", () => {
    const text = upgrade.steps.flatMap((s) => s.log.map((l) => `${l.who}: ${l.text}`)).join("\n");
    expect(text).toMatch(/builder: .*budget/);
    expect(text).toMatch(/engineer: /);
  });
});

describe("the tour", () => {
  it("points every stop at a real ticket and a real point on its route", () => {
    for (const stop of TOUR) {
      const ticket = byId(stop.ticketId);
      expect(ticket).toBeDefined();
      const step = ticket.steps[stop.cursor.step];
      expect(step).toBeDefined();
      expect(stop.cursor.shown).toBeLessThanOrEqual(step.log.length);
    }
  });

  it("includes the stopped line, the budget hand-over and the rollback", () => {
    const at = TOUR.filter((s) => s.ticketId === "upgrade").map((s) => upgrade.steps[s.cursor.step].station);
    expect(at).toEqual(["gates", "build", "release"]);
  });

  it("lasts about ninety seconds", () => {
    expect((TOUR.length * TOUR_STOP_MS) / 1000).toBeGreaterThanOrEqual(75);
    expect((TOUR.length * TOUR_STOP_MS) / 1000).toBeLessThanOrEqual(110);
  });
});

describe("one event at a time", () => {
  const start = () => Object.fromEntries(TICKETS.map((t) => [t.id, START]));

  it("gives the fast-lane ticket two turns per round", () => {
    expect(turnOrder(TICKETS)).toEqual(["feature", "bug", "performance", "upgrade", "bug"]);
  });

  it("moves exactly one ticket per event, in turn", () => {
    const a = stepOne(TICKETS, start(), 0, 1)!;
    expect(a.event.ticketId).toBe("feature");
    expect(a.cursors.bug).toEqual(START);
    const b = stepOne(TICKETS, a.cursors, a.turn, 2)!;
    expect(b.event.ticketId).toBe("bug");
  });

  it("skips finished tickets and stops when all are done", () => {
    const done = Object.fromEntries(TICKETS.map((t) => [t.id, jumpTo(t, lastStep(t))]));
    expect(stepOne(TICKETS, { ...done, performance: START }, 0, 1)!.event.ticketId).toBe("performance");
    expect(stepOne(TICKETS, done, 0, 1)).toBeNull();
  });

  it("describes a move to a new column, and the tests it turned red", () => {
    const ev = describeChange(feature, jumpTo(feature, 1), { step: 2, shown: 0 }, 7);
    expect(ev.moved).toBe(true);
    expect(ev.movedBack).toBe(false);
    expect(ev.line).toBeNull();
    expect(ev.tests).toContain("unit");
  });

  it("describes a new log line and who said it", () => {
    const ev = describeChange(feature, { step: 1, shown: 1 }, { step: 1, shown: 2 }, 8);
    expect(ev.moved).toBe(false);
    expect(ev.line?.who).toBe("owner");
    expect(ev.assigneeChanged).toBe(true);
  });

  it("assigns the ticket to whoever spoke last, or the station's first worker", () => {
    expect(assigneeAt(feature, { step: 1, shown: 0 })).toBe("planner");
    expect(assigneeAt(feature, { step: 1, shown: 2 })).toBe("owner");
  });
});

describe("test states", () => {
  it("shows nothing before tests are written, red after, green once the build is done", () => {
    expect(testState(feature, "unit", jumpTo(feature, 1))).toBe("none");
    expect(testState(feature, "unit", jumpTo(feature, 2))).toBe("red");
    expect(testState(feature, "unit", { step: 3, shown: 1 })).toBe("red");
    expect(testState(feature, "unit", jumpTo(feature, 3))).toBe("green");
  });

  it("marks kinds a ticket does not need", () => {
    expect(testState(bug, "evals", jumpTo(bug, 5))).toBe("na");
  });
});

describe("totals", () => {
  it("counts nothing before the first line", () => {
    const t = totalsAt(feature, START);
    expect(t.aiUsd).toBe(0);
    expect(t.wallMinutes).toBe(0);
  });

  it("grows as playback moves on", () => {
    const early = totalsAt(feature, jumpTo(feature, 2));
    const late = totalsFor(feature);
    expect(late.aiUsd).toBeGreaterThan(early.aiUsd);
    expect(late.wallMinutes).toBeGreaterThan(early.wallMinutes);
  });

  it("prices tokens by model size", () => {
    // Intake on the feature ticket is 72k small-model tokens at $0.15 a million, plus 1 compute minute.
    const t = totalsAt(feature, jumpTo(feature, 0));
    expect(t.aiUsd).toBeCloseTo(0.0108, 5);
    expect(t.computeUsd).toBeCloseTo(0.02, 5);
  });

  it("splits token shares that sum to one", () => {
    const shares = tierShares(totalsFor(feature));
    expect(shares.small + shares.medium + shares.large).toBeCloseTo(1, 6);
  });
});

describe("formatting", () => {
  it("formats elapsed time", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(95)).toBe("1 h 35 min");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(1440)).toBe("1 day");
    expect(formatMinutes(10080)).toBe("7 days");
  });

  it("formats money", () => {
    expect(formatUsd(0.018)).toBe("$0.02");
    expect(formatUsd(14.4)).toBe("$14");
    expect(formatUsd(1234.5)).toBe("$1,235");
  });
});

describe("address bar", () => {
  it("reads a ticket and a 1-based step", () => {
    expect(parseLocation(TICKETS, "bug", "3")).toEqual({ ticketId: "bug", step: 2 });
    expect(parseLocation(TICKETS, "upgrade", "16")).toEqual({ ticketId: "upgrade", step: 15 });
  });

  it("ignores values that mean nothing", () => {
    expect(parseLocation(TICKETS, "nope", "0")).toEqual({ ticketId: "feature", step: null });
    expect(parseLocation(TICKETS, undefined, "abc")).toEqual({ ticketId: "feature", step: null });
    expect(parseLocation(TICKETS, "feature", "11")).toEqual({ ticketId: "feature", step: null });
  });
});

import { describe, expect, it } from "vitest";
import {
  formatMinutes,
  formatUsd,
  isFinished,
  jumpTo,
  LAST_STATION,
  parseLocation,
  START,
  stepAt,
  testState,
  tick,
  tierShares,
  totalsAt,
  totalsFor,
} from "./logic";
import { ACTORS, STATIONS } from "./stations";
import { TICKETS } from "./tickets";
import { STATION_IDS } from "./types";

const feature = TICKETS.find((t) => t.id === "feature")!;
const bug = TICKETS.find((t) => t.id === "bug")!;

describe("content", () => {
  it("has one station per id, in order", () => {
    expect(STATIONS.map((s) => s.id)).toEqual([...STATION_IDS]);
  });

  it("gives every ticket exactly one step per station, in order", () => {
    for (const ticket of TICKETS) {
      expect(ticket.steps.map((s) => s.station)).toEqual([...STATION_IDS]);
    }
  });

  it("only names actors that exist", () => {
    for (const ticket of TICKETS) {
      for (const step of ticket.steps) {
        for (const line of step.log) expect(ACTORS[line.who]).toBeDefined();
      }
    }
  });

  it("never turns a test green before it is written", () => {
    for (const ticket of TICKETS) {
      for (const tests of Object.values(ticket.tests)) {
        expect(STATION_IDS.indexOf(tests.greenAt)).toBeGreaterThanOrEqual(STATION_IDS.indexOf(tests.writtenAt));
      }
    }
  });

  it("explains every skipped or light station", () => {
    for (const ticket of TICKETS) {
      for (const step of ticket.steps) {
        if (step.mode !== "full") expect(step.reason).toBeTruthy();
      }
    }
  });
});

describe("playback", () => {
  it("reveals lines one at a time, then moves to the next station", () => {
    const first = stepAt(feature, 0).log.length;
    let cursor = START;
    for (let i = 0; i < first; i++) cursor = tick(feature, cursor)!;
    expect(cursor).toEqual({ station: 0, shown: first });
    expect(tick(feature, cursor)).toEqual({ station: 1, shown: 0 });
  });

  it("stops at the end of the last station", () => {
    let cursor = START;
    let guard = 0;
    for (;;) {
      const next = tick(bug, cursor);
      if (!next) break;
      cursor = next;
      if (++guard > 500) throw new Error("playback never ended");
    }
    expect(isFinished(bug, cursor)).toBe(true);
  });

  it("clamps jumps to the line", () => {
    expect(jumpTo(feature, -3).station).toBe(0);
    expect(jumpTo(feature, 99).station).toBe(LAST_STATION);
  });
});

describe("test wall", () => {
  it("shows nothing before tests are written, red after, green once the build is done", () => {
    expect(testState(feature, "unit", jumpTo(feature, 1))).toBe("none");
    expect(testState(feature, "unit", jumpTo(feature, 2))).toBe("red");
    expect(testState(feature, "unit", { station: 3, shown: 1 })).toBe("red");
    expect(testState(feature, "unit", jumpTo(feature, 3))).toBe("green");
  });

  it("marks kinds a ticket does not need", () => {
    expect(testState(bug, "evals", jumpTo(bug, 5))).toBe("na");
    expect(testState(bug, "load", jumpTo(bug, 6))).toBe("na");
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
    // Intake on the feature ticket is 18k small-model tokens at $1 a million, plus 1 compute minute.
    const t = totalsAt(feature, jumpTo(feature, 0));
    expect(t.aiUsd).toBeCloseTo(0.018, 5);
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
  it("reads a ticket and a 1-based station", () => {
    expect(parseLocation(TICKETS, "bug", "3")).toEqual({ ticketId: "bug", station: 2 });
  });

  it("ignores values that mean nothing", () => {
    expect(parseLocation(TICKETS, "nope", "0")).toEqual({ ticketId: "feature", station: null });
    expect(parseLocation(TICKETS, undefined, "abc")).toEqual({ ticketId: "feature", station: null });
    expect(parseLocation(TICKETS, "feature", "11")).toEqual({ ticketId: "feature", station: null });
  });
});

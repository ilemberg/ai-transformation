import { describe, expect, it } from "vitest";
import { EVENTS, LAST_MONTH, METRICS, MONTHS, PAIRS, PHASES, RULES, SIGNALS, TIER_SHARES, type Rule } from "./data";
import {
  baselineOf,
  clampMonth,
  deltaVsBaseline,
  firedMonths,
  formatDelta,
  formatTarget,
  formatValue,
  lookupSeries,
  meetsTarget,
  metricById,
  pairVerdict,
  parseMonth,
  phaseFor,
  ruleFiresAt,
  ruleStatus,
  valueAt,
} from "./logic";

const rule = (id: string): Rule => {
  const r = RULES.find((x) => x.id === id);
  if (!r) throw new Error(id);
  return r;
};

describe("months", () => {
  it("clamps and rounds", () => {
    expect(clampMonth(-3)).toBe(0);
    expect(clampMonth(99)).toBe(LAST_MONTH);
    expect(clampMonth(4.4)).toBe(4);
    expect(clampMonth(Number.NaN)).toBe(0);
  });

  it("parses the query value, falling back on junk", () => {
    expect(parseMonth("5", 12)).toBe(5);
    expect(parseMonth("40", 12)).toBe(12);
    expect(parseMonth(null, 12)).toBe(12);
    expect(parseMonth("", 3)).toBe(3);
    expect(parseMonth("abc", 3)).toBe(3);
    expect(parseMonth("2.5", 3)).toBe(3);
  });
});

describe("values and deltas", () => {
  const latency = { series: [20, 20, 30], lowerIsBetter: true, tolerance: 1 };

  it("reads a value at a month", () => {
    expect(valueAt([1, 2, 3], 1)).toBe(2);
  });

  it("averages the baseline months", () => {
    expect(baselineOf([10, 20, 99])).toBe(15);
  });

  it("calls a rise worse when lower is better", () => {
    const d = deltaVsBaseline(latency, 2);
    expect(d.diff).toBe(10);
    expect(d.relative).toBe(50);
    expect(d.direction).toBe("up");
    expect(d.effect).toBe("worse");
  });

  it("calls a rise better when higher is better", () => {
    expect(deltaVsBaseline({ ...latency, lowerIsBetter: false }, 2).effect).toBe("better");
  });

  it("treats changes inside the tolerance as the same, but flags drift", () => {
    const d = deltaVsBaseline({ series: [12, 12, 12.4], lowerIsBetter: true, tolerance: 0.5 }, 2);
    expect(d.effect).toBe("same");
    expect(d.drifting).toBe(true);
    const tiny = deltaVsBaseline({ series: [12, 12, 12.1], lowerIsBetter: true, tolerance: 0.5 }, 2);
    expect(tiny.drifting).toBe(false);
  });

  it("is not fooled by floating-point noise", () => {
    const d = deltaVsBaseline({ series: [99.94, 99.94, 99.93], lowerIsBetter: false, tolerance: 0.02 }, 2);
    expect(d.diff).toBe(-0.01);
    expect(d.drifting).toBe(false);
  });
});

describe("pair verdict", () => {
  const speed = (series: number[]) => ({ series, lowerIsBetter: true, tolerance: 1, short: "Cycle time" });
  const quality = (series: number[]) => ({ series, lowerIsBetter: true, tolerance: 0.5, short: "CFR" });

  it("is a regression when speed improves and its partner worsens", () => {
    expect(pairVerdict(speed([50, 50, 30]), quality([12, 12, 14]), 2).verdict).toBe("Regression");
  });

  it("is healthy when speed improves and its partner holds", () => {
    expect(pairVerdict(speed([50, 50, 30]), quality([12, 12, 12]), 2).verdict).toBe("Healthy");
  });

  it("is watch when quality worsens with no speed gain", () => {
    expect(pairVerdict(speed([50, 50, 50]), quality([12, 12, 14]), 2).verdict).toBe("Watch");
  });

  it("is watch when speed gets worse", () => {
    expect(pairVerdict(speed([50, 50, 60]), quality([12, 12, 12]), 2).verdict).toBe("Watch");
  });

  it("is watch when quality drifts inside noise", () => {
    expect(pairVerdict(speed([50, 50, 30]), quality([12, 12, 12.4]), 2).verdict).toBe("Watch");
  });

  it("is healthy at baseline", () => {
    expect(pairVerdict(speed([50, 50]), quality([12, 12]), 0).verdict).toBe("Healthy");
  });
});

describe("phases", () => {
  it("maps each month to its phase", () => {
    expect(phaseFor(0).id).toBe("baseline");
    expect(phaseFor(1).id).toBe("baseline");
    expect(phaseFor(2).id).toBe("pilot");
    expect(phaseFor(3).id).toBe("pilot");
    expect(phaseFor(4).id).toBe("expand");
    expect(phaseFor(6).id).toBe("expand");
    expect(phaseFor(7).id).toBe("steady");
    expect(phaseFor(12).id).toBe("steady");
  });

  it("covers every month exactly once", () => {
    for (let m = 0; m < MONTHS; m++) {
      expect(PHASES.filter((p) => m >= p.start && m <= p.end)).toHaveLength(1);
    }
  });
});

describe("rules", () => {
  const fake = (series: Record<string, number[]>) => (id: string) => {
    const s = series[id];
    if (!s) throw new Error(id);
    return s;
  };

  it("tests each kind of condition", () => {
    const lookup = fake({ a: [10, 10, 11, 9], b: [5, 5, 5, 5] });
    expect(ruleFiresAt({ test: { kind: "aboveBaseline", metric: "a", margin: 0.5 } }, 2, lookup)).toBe(true);
    expect(ruleFiresAt({ test: { kind: "aboveBaseline", metric: "a", margin: 0.5 } }, 1, lookup)).toBe(false);
    expect(ruleFiresAt({ test: { kind: "above", series: "a", threshold: 10 } }, 2, lookup)).toBe(true);
    expect(ruleFiresAt({ test: { kind: "below", series: "a", threshold: 10 } }, 3, lookup)).toBe(true);
    expect(ruleFiresAt({ test: { kind: "aboveSeries", series: "a", other: "b" } }, 0, lookup)).toBe(true);
  });

  it("reports idle, active and cleared", () => {
    const lookup = fake({ x: [0, 0, 5, 5, 0, 0] });
    const r = { test: { kind: "above" as const, series: "x", threshold: 1 } };
    expect(ruleStatus(r, 1, lookup)).toEqual({ state: "idle" });
    expect(ruleStatus(r, 3, lookup)).toEqual({ state: "active", firstFired: 2, since: 2 });
    expect(ruleStatus(r, 5, lookup)).toEqual({ state: "cleared", firstFired: 2, clearedAt: 4 });
    expect(firedMonths(r, 5, lookup)).toEqual([2, 3]);
  });

  // The story Bookwell's year tells.
  it("pauses expansion in months 4 and 5 and clears at month 6", () => {
    expect(firedMonths(rule("cfr"), LAST_MONTH)).toEqual([4, 5]);
    expect(ruleStatus(rule("cfr"), 6)).toEqual({ state: "cleared", firstFired: 4, clearedAt: 6 });
  });

  it("flags review as the bottleneck in months 4 and 5", () => {
    expect(firedMonths(rule("review"), LAST_MONTH)).toEqual([4, 5]);
  });

  it("blocks the release at month 8 after the model upgrade", () => {
    expect(firedMonths(rule("eval"), LAST_MONTH)).toEqual([8]);
    expect(ruleStatus(rule("eval"), 9)).toEqual({ state: "cleared", firstFired: 8, clearedAt: 9 });
  });

  it("catches agent code reworked more than human code during expansion", () => {
    expect(firedMonths(rule("rework"), LAST_MONTH)).toEqual([4, 5, 6]);
  });

  it("spends the error budget once, in month 5, and never ranks people", () => {
    expect(firedMonths(rule("budget"), LAST_MONTH)).toEqual([5]);
    expect(firedMonths(rule("rank"), LAST_MONTH)).toEqual([]);
  });

  it("has nothing firing before expansion", () => {
    for (const r of RULES) expect(firedMonths(r, 3)).toEqual([]);
  });
});

describe("the story in the pairs", () => {
  const verdict = (pairId: string, m: number) => {
    const p = PAIRS.find((x) => x.id === pairId);
    if (!p) throw new Error(pairId);
    return pairVerdict(metricById(p.speed), metricById(p.quality), m).verdict;
  };

  it("pilot moves the six-team roll-up a little, with CFR flat", () => {
    const d = deltaVsBaseline(metricById("cycleTime"), 3);
    expect(d.relative).toBeLessThan(-5);
    expect(d.relative).toBeGreaterThan(-12);
    expect(deltaVsBaseline(metricById("cfr"), 3).effect).not.toBe("worse");
    expect(verdict("flow", 3)).toBe("Healthy");
  });

  it("gives back some of the pilot gain when expansion starts", () => {
    const ct = metricById("cycleTime").series;
    expect(valueAt(ct, 4)).toBeGreaterThan(valueAt(ct, 3));
    const tp = metricById("throughput").series;
    expect(valueAt(tp, 4)).toBeLessThan(valueAt(tp, 3));
  });

  it("ends the year with modest, DORA-plausible gains", () => {
    const rel = (id: string) => deltaVsBaseline(metricById(id), 12).relative;
    expect(rel("cycleTime")).toBeGreaterThanOrEqual(-30);
    expect(rel("cycleTime")).toBeLessThanOrEqual(-25);
    expect(rel("throughput")).toBeGreaterThanOrEqual(30);
    expect(rel("throughput")).toBeLessThanOrEqual(35);
    expect(rel("deployFreq")).toBeGreaterThanOrEqual(40);
    expect(rel("deployFreq")).toBeLessThan(60);
    const cfr = metricById("cfr").series;
    expect(Math.max(...cfr)).toBeGreaterThanOrEqual(15);
    expect(valueAt(cfr, 12)).toBeGreaterThanOrEqual(10);
    expect(valueAt(cfr, 12)).toBeLessThanOrEqual(11);
  });

  it("dips developer experience during expansion, then recovers", () => {
    const devex = metricById("devex").series;
    expect(valueAt(devex, 5)).toBeLessThan(baselineOf(devex));
    expect(valueAt(devex, 12)).toBeGreaterThan(baselineOf(devex));
  });

  it("shows regressions in month 5, scars at month 6 and all healthy at month 12", () => {
    expect(verdict("flow", 5)).toBe("Regression");
    expect(verdict("people", 5)).toBe("Regression");
    expect(verdict("agents", 5)).toBe("Regression");
    expect(verdict("flow", 6)).toBe("Watch");
    expect(verdict("agents", 6)).toBe("Regression");
    for (const p of PAIRS) expect(verdict(p.id, 12)).toBe("Healthy");
  });

  it("is healthy everywhere at baseline", () => {
    for (const p of PAIRS) expect(verdict(p.id, 0)).toBe("Healthy");
  });

  it("spends more early, then less as routing and caching land", () => {
    const spend = metricById("spend").series;
    const peak = Math.max(...spend);
    expect(spend.indexOf(peak)).toBe(4);
    expect(valueAt(spend, 0)).toBeLessThan(3);
    expect(valueAt(spend, 12)).toBeGreaterThanOrEqual(20);
    expect(valueAt(spend, 12)).toBeLessThanOrEqual(24);
    const cache = metricById("cacheHit").series;
    expect(valueAt(cache, 0)).toBeLessThanOrEqual(15);
    expect(valueAt(cache, 12)).toBeGreaterThanOrEqual(70);
    expect(TIER_SHARES[12]).toEqual({ small: 35, medium: 45, large: 20 });
    expect(valueAt(TIER_SHARES.map((t) => t.large), 12)).toBeLessThan(valueAt(TIER_SHARES.map((t) => t.large), 3));
  });
});

describe("data shape", () => {
  it("has a reading for every month in every series", () => {
    for (const m of METRICS) expect(m.series, m.id).toHaveLength(MONTHS);
    for (const [id, s] of Object.entries(SIGNALS)) expect(s, id).toHaveLength(MONTHS);
    expect(TIER_SHARES).toHaveLength(MONTHS);
  });

  it("has tier shares that sum to 100", () => {
    for (const t of TIER_SHARES) expect(t.small + t.medium + t.large).toBe(100);
  });

  it("treats agent-written share as context, never better or worse", () => {
    const share = metricById("agentShare");
    expect(share.descriptive).toBe(true);
    expect(share.target).toBeUndefined();
    expect(deltaVsBaseline(share, 12).effect).toBe("context");
    expect(PAIRS.some((p) => p.speed === "agentShare" || p.quality === "agentShare")).toBe(false);
  });

  it("has unique metric ids, and pairs and rules that point at real series", () => {
    expect(new Set(METRICS.map((m) => m.id)).size).toBe(METRICS.length);
    for (const p of PAIRS) {
      // The speed side is a speed metric, or first-pass rate for the agent pair; never a descriptive one.
      expect(metricById(p.speed).descriptive).not.toBe(true);
      expect(metricById(p.quality).kind).toBe("quality");
    }
    for (const r of RULES) {
      const t = r.test;
      const ids = t.kind === "aboveBaseline" ? [t.metric] : t.kind === "aboveSeries" ? [t.series, t.other] : [t.series];
      for (const id of ids) expect(() => lookupSeries(id)).not.toThrow();
    }
  });

  it("has events inside the year", () => {
    for (const e of EVENTS) expect(e.month).toBeGreaterThanOrEqual(0);
    for (const e of EVENTS) expect(e.month).toBeLessThanOrEqual(LAST_MONTH);
  });
});

describe("formatting and targets", () => {
  it("formats values with units", () => {
    expect(formatValue(metricById("spend"), 3.1)).toBe("$3.10");
    expect(formatValue(metricById("cycleTime"), 37)).toBe("37 h");
    expect(formatValue(metricById("uptime"), 99.9)).toBe("99.90%");
  });

  it("formats deltas as percent or points", () => {
    const ct = metricById("cycleTime");
    expect(formatDelta(ct, deltaVsBaseline(ct, 12))).toBe("−29%");
    const cfr = metricById("cfr");
    expect(formatDelta(cfr, deltaVsBaseline(cfr, 5))).toBe("+3.8 pts");
    const spend = metricById("spend");
    expect(formatDelta(spend, deltaVsBaseline(spend, 12))).toBe("+$19.90");
    expect(formatDelta(cfr, deltaVsBaseline(cfr, 0))).toBe("no change");
  });

  it("checks targets in either direction", () => {
    expect(meetsTarget({ op: "<=", value: 24 }, 20)).toBe(true);
    expect(meetsTarget({ op: "<=", value: 24 }, 27)).toBe(false);
    expect(meetsTarget({ op: ">=", value: 92 }, 89)).toBe(false);
    expect(meetsTarget(undefined, 1)).toBeNull();
    expect(formatTarget(metricById("reviewLatency"))).toBe("≤ 24 h");
  });
});

import { describe, expect, it } from "vitest";
import {
  ALERTS,
  ALERTS_NOW,
  INCIDENT,
  JOURNEYS,
  MODEL_CALLS,
  QUALITY_CATEGORIES,
  QUALITY_WEEKS,
  SLO_TARGET,
  TRACES,
  TRACE_IDS,
  traceById,
  traceHref,
} from "./data";
import {
  ALL,
  alertStats,
  budgetLeftMinutes,
  burnRate,
  burnStatus,
  dayPct,
  daySeries,
  errorBudgetMinutes,
  filterCalls,
  formatMs,
  formatUsd,
  layoutWaterfall,
  linePoints,
  median,
  minutesBetween,
  parseTraceId,
  passPct,
  percentile,
  POINTS_PER_DAY,
  summarizeCalls,
  traceDuration,
  waterfallTicks,
} from "./logic";

describe("layoutWaterfall", () => {
  const spans = [
    { id: "b", parent: "a", start: 50, duration: 25 },
    { id: "a", start: 0, duration: 100 },
    { id: "c", parent: "a", start: 10, duration: 20 },
    { id: "d", parent: "c", start: 12, duration: 0 },
  ];

  it("orders parents before children and siblings by start", () => {
    expect(layoutWaterfall(spans).map((r) => [r.span.id, r.depth])).toEqual([
      ["a", 0],
      ["c", 1],
      ["d", 2],
      ["b", 1],
    ]);
  });

  it("places bars as percentages of the trace, with a minimum width", () => {
    const rows = layoutWaterfall(spans);
    const b = rows.find((r) => r.span.id === "b")!;
    expect(b.left).toBe(50);
    expect(b.width).toBe(25);
    expect(rows.find((r) => r.span.id === "d")!.width).toBeGreaterThan(0);
  });

  it("treats a span with an unknown parent as a root", () => {
    expect(layoutWaterfall([{ id: "x", parent: "gone", start: 0, duration: 10 }])[0]!.depth).toBe(0);
  });

  it("lays out every trace with children inside their parents", () => {
    for (const t of TRACES) {
      const rows = layoutWaterfall(t.spans);
      expect(rows).toHaveLength(t.spans.length);
      for (const s of t.spans) {
        const p = t.spans.find((x) => x.id === s.parent);
        if (!p) continue;
        expect(s.start).toBeGreaterThanOrEqual(p.start);
        expect(s.start + s.duration).toBeLessThanOrEqual(p.start + p.duration);
      }
    }
  });
});

describe("waterfallTicks", () => {
  it("uses round steps up to the total", () => {
    expect(waterfallTicks(640)).toEqual([0, 200, 400, 600]);
    expect(waterfallTicks(6180)).toEqual([0, 2000, 4000, 6000]);
    expect(waterfallTicks(0)).toEqual([0]);
  });
});

describe("parseTraceId", () => {
  const known = ["tr_a", "tr_b"];
  it("prefers the query, then the hash, then the fallback", () => {
    expect(parseTraceId("tr_b", "#tr_a", known, "tr_a")).toBe("tr_b");
    expect(parseTraceId(null, "#trace=tr_b", known, "tr_a")).toBe("tr_b");
    expect(parseTraceId(null, "#tr_b", known, "tr_a")).toBe("tr_b");
    expect(parseTraceId("tr_zz", "#trace", known, "tr_a")).toBe("tr_a");
    expect(parseTraceId(" tr_b ", "", known, "tr_a")).toBe("tr_b");
  });

  it("round-trips traceHref for every trace", () => {
    for (const id of TRACE_IDS) {
      const url = new URL(traceHref(id), "https://example.test");
      expect(url.pathname).toBe("/observe");
      expect(url.hash).toBe("#trace");
      expect(parseTraceId(url.searchParams.get("trace"), url.hash, TRACE_IDS, "none")).toBe(id);
    }
  });
});

describe("traces match the board", () => {
  it("normal rebooking trace: ~640 ms, rebook-v3, $0.004, 2.1k tokens, 1 tool call", () => {
    const t = traceById("tr_9c41e2");
    expect(traceDuration(t.spans)).toBe(640);
    const attrs = Object.fromEntries(t.spans.find((s) => s.kind === "model")!.attrs);
    expect(attrs.prompt).toBe("rebook-v3");
    expect(attrs.cost).toBe("$0.004");
    expect(attrs.tokens_total).toBe("2.1k");
    expect(attrs.tool_calls).toBe("1");
  });

  it("canary trace has the 2.3 s model call; error trace is BW-311's deploy", () => {
    expect(traceById("tr_5b07d4").spans.find((s) => s.kind === "model")!.duration).toBe(2300);
    expect(traceById("tr_e30a17").release).toBe("2026.11.09-3");
  });
});

describe("model calls", () => {
  it("filters on feature, tier and outcome", () => {
    expect(filterCalls(MODEL_CALLS, { feature: ALL, tier: ALL, outcome: ALL })).toHaveLength(MODEL_CALLS.length);
    const fb = filterCalls(MODEL_CALLS, { feature: "Rebooking assistant", tier: ALL, outcome: "fallback" });
    expect(fb.length).toBeGreaterThan(0);
    expect(fb.every((c) => c.fallback)).toBe(true);
    expect(filterCalls(MODEL_CALLS, { feature: ALL, tier: "large", outcome: "slow" })).toHaveLength(0);
  });

  it("percentile and median", () => {
    expect(percentile([], 95)).toBe(0);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10);
    expect(percentile([5, 1, 3], 50)).toBe(3);
    expect(median([1, 3, 14, 4])).toBe(3.5);
    expect(median([])).toBe(0);
  });

  it("summarises calls", () => {
    const s = summarizeCalls([
      { feature: "x", tier: "small", outcome: "ok", latencyMs: 100, costUsd: 0.001, cacheHit: true, fallback: false },
      { feature: "x", tier: "small", outcome: "fallback", latencyMs: 300, costUsd: 0.003, cacheHit: false, fallback: true },
    ]);
    expect(s.calls).toBe(2);
    expect(s.p95Ms).toBe(300);
    expect(s.costUsd).toBeCloseTo(0.004);
    expect(s.cacheRate).toBe(0.5);
    expect(s.fallbackRate).toBe(0.5);
    expect(summarizeCalls([]).cacheRate).toBe(0);
  });
});

describe("error budget and burn rate", () => {
  it("99.9% over 30 days allows 43.2 minutes", () => {
    expect(errorBudgetMinutes(99.9, 30)).toBeCloseTo(43.2);
    expect(budgetLeftMinutes(99.95, 99.9, 30)).toBeCloseTo(21.6);
    expect(budgetLeftMinutes(99.8, 99.9, 30)).toBeCloseTo(-43.2);
  });

  it("burn rate is the error share over the allowed share", () => {
    expect(burnRate(0.6, 99.9)).toBeCloseTo(6);
    expect(burnRate(0.1, 99.9)).toBeCloseTo(1);
    expect(burnRate(1, 100)).toBe(Infinity);
  });

  it("classifies burn with the multi-window rule", () => {
    expect(burnStatus(14.4, 0)).toBe("burning");
    expect(burnStatus(2, 6)).toBe("burning");
    expect(burnStatus(2.1, 1.2)).toBe("watch");
    expect(burnStatus(0.3, 0.5)).toBe("healthy");
  });

  it("every journey still has budget left", () => {
    for (const j of JOURNEYS) expect(budgetLeftMinutes(j.uptimePct, SLO_TARGET)).toBeGreaterThan(0);
  });
});

describe("alerts", () => {
  it("counts pages in the last week", () => {
    const s = alertStats(ALERTS, ALERTS_NOW);
    expect(s.pages).toBe(4);
    expect(s.actionablePct).toBe(50);
    expect(s.medianAckMinutes).toBe(3.5);
    expect(alertStats([], ALERTS_NOW)).toEqual({ pages: 0, actionablePct: 0, medianAckMinutes: 0 });
  });

  it("BW-311: ack 3 min, restore 52 min", () => {
    const alert = ALERTS.find((a) => a.ticket === "BW-311" && a.actionable)!;
    expect(alert.ackMinutes).toBe(3);
    expect(minutesBetween(INCIDENT.impactStart, INCIDENT.restored)).toBe(52);
    expect(minutesBetween("23:50", "00:10")).toBe(20);
  });
});

describe("health series", () => {
  it("is deterministic, one point per 15 minutes, and applies events", () => {
    const a = daySeries(640, 0.02, [{ from: "14:15", to: "14:30", latencyMs: 2300 }], 4);
    const b = daySeries(640, 0.02, [{ from: "14:15", to: "14:30", latencyMs: 2300 }], 4);
    expect(a).toEqual(b);
    expect(a.latency).toHaveLength(POINTS_PER_DAY);
    expect(a.latency[57]).toBe(2300); // 14:15
    expect(a.latency[58]).not.toBe(2300);
    expect(Math.max(...a.latency.filter((_, i) => i !== 57))).toBeLessThan(800);
  });

  it("maps times and draws lines inside the box", () => {
    expect(dayPct("12:00")).toBe(50);
    expect(linePoints([0, 10], 100, 20, 0, 10)).toBe("0,20 100,0");
    expect(linePoints([50], 100, 20, 0, 10)).toBe("0,0");
  });
});

describe("quality", () => {
  it("pass rates stay above the threshold; blocking checks never fail", () => {
    for (const w of QUALITY_WEEKS) expect(passPct(w.passed, w.sampled)).toBeGreaterThanOrEqual(92);
    for (const c of QUALITY_CATEGORIES) {
      expect(c.passed).toHaveLength(QUALITY_WEEKS.length);
      if (c.blocking) expect(c.passed.every((p) => p === 200)).toBe(true);
    }
    expect(passPct(0, 0)).toBe(0);
  });
});

describe("formatting", () => {
  it("formats latency and cost", () => {
    expect(formatMs(640)).toBe("640 ms");
    expect(formatMs(2300)).toBe("2.3 s");
    expect(formatMs(11200)).toBe("11 s");
    expect(formatUsd(0.004)).toBe("$0.004");
    expect(formatUsd(0.0002)).toBe("$0.0002");
    expect(formatUsd(0.112)).toBe("$0.112");
    expect(formatUsd(1.5)).toBe("$1.50");
  });
});

/**
 * Pure logic for the Observe page: the trace waterfall, the model-call
 * filters and summary, error budgets and burn rates, alert stats, the
 * 24-hour health series and the trace deep link.
 */

// ---------- trace waterfall ----------

export type SpanLike = { id: string; parent?: string; start: number; duration: number };

export type WaterfallRow<S extends SpanLike> = {
  span: S;
  depth: number;
  /** Offset from the trace start, as a percentage of the whole trace. */
  left: number;
  /** Width as a percentage of the whole trace; never thinner than MIN_BAR. */
  width: number;
};

export const MIN_BAR = 0.6;

export function traceDuration(spans: SpanLike[]): number {
  return spans.reduce((max, s) => Math.max(max, s.start + s.duration), 0);
}

/** Rows in tree order (parents before children, siblings by start time) with bar offsets. */
export function layoutWaterfall<S extends SpanLike>(spans: S[]): WaterfallRow<S>[] {
  const total = traceDuration(spans) || 1;
  const ids = new Set(spans.map((s) => s.id));
  const children = new Map<string | undefined, S[]>();
  for (const s of spans) {
    const key = s.parent && ids.has(s.parent) ? s.parent : undefined;
    const list = children.get(key) ?? [];
    list.push(s);
    children.set(key, list);
  }
  for (const list of children.values()) list.sort((a, b) => a.start - b.start);

  const rows: WaterfallRow<S>[] = [];
  const walk = (parent: string | undefined, depth: number) => {
    for (const s of children.get(parent) ?? []) {
      const left = (s.start / total) * 100;
      const width = Math.min(Math.max((s.duration / total) * 100, MIN_BAR), 100 - left);
      rows.push({ span: s, depth, left, width: Math.max(width, 0) });
      walk(s.id, depth + 1);
    }
  };
  walk(undefined, 0);
  return rows;
}

/** Evenly spaced, round tick values from 0 up to (and not past) the total. */
export function waterfallTicks(total: number, target = 4): number[] {
  if (total <= 0) return [0];
  const raw = total / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let t = 0; t <= total + 1e-9; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return ticks;
}

// ---------- deep link ----------

/**
 * The trace to show: `?trace=` first, then a hash of the form `#trace=tr_…`
 * or `#tr_…`; anything unknown falls back to the default.
 */
export function parseTraceId(query: string | null | undefined, hash: string | null | undefined, known: readonly string[], fallback: string): string {
  const q = query?.trim();
  if (q && known.includes(q)) return q;
  const h = (hash ?? "").replace(/^#/, "");
  const fromHash = h.startsWith("trace=") ? h.slice("trace=".length) : h;
  if (fromHash && known.includes(fromHash)) return fromHash;
  return fallback;
}

// ---------- model calls ----------

export type CallLike = {
  feature: string;
  tier: string;
  outcome: string;
  latencyMs: number;
  costUsd: number;
  cacheHit: boolean;
  fallback: boolean;
};

export type CallFilter = { feature: string; tier: string; outcome: string };

export const ALL = "all";

export function filterCalls<C extends CallLike>(calls: C[], f: CallFilter): C[] {
  return calls.filter(
    (c) => (f.feature === ALL || c.feature === f.feature) && (f.tier === ALL || c.tier === f.tier) && (f.outcome === ALL || c.outcome === f.outcome),
  );
}

/** Nearest-rank percentile; 0 for an empty list. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1]!;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export type CallSummary = { calls: number; p95Ms: number; costUsd: number; cacheRate: number; fallbackRate: number };

export function summarizeCalls(calls: CallLike[]): CallSummary {
  const n = calls.length;
  return {
    calls: n,
    p95Ms: percentile(
      calls.map((c) => c.latencyMs),
      95,
    ),
    costUsd: calls.reduce((sum, c) => sum + c.costUsd, 0),
    cacheRate: n ? calls.filter((c) => c.cacheHit).length / n : 0,
    fallbackRate: n ? calls.filter((c) => c.fallback).length / n : 0,
  };
}

/** Distinct values in first-seen order, for filter options. */
export function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}

// ---------- error budget and burn rate ----------

const MINUTES_PER_DAY = 1440;

/** Minutes of full outage the target allows over the window. 99.9% over 30 days is 43.2. */
export function errorBudgetMinutes(targetPct: number, days = 30): number {
  return ((100 - targetPct) / 100) * days * MINUTES_PER_DAY;
}

/** Budget minutes left given measured uptime; negative when overspent. */
export function budgetLeftMinutes(uptimePct: number, targetPct: number, days = 30): number {
  const used = ((100 - uptimePct) / 100) * days * MINUTES_PER_DAY;
  return errorBudgetMinutes(targetPct, days) - used;
}

/** How many times faster than allowed the budget is being spent. 1 = exactly on budget. */
export function burnRate(errorPct: number, targetPct: number): number {
  const allowed = 100 - targetPct;
  return allowed > 0 ? errorPct / allowed : Infinity;
}

export type BurnStatus = "burning" | "watch" | "healthy";

/** Multi-window rule: 14.4x over 1 h or 6x over 6 h pages; anything over 1x is worth watching. */
export function burnStatus(burn1h: number, burn6h: number): BurnStatus {
  if (burn1h >= 14.4 || burn6h >= 6) return "burning";
  if (burn1h > 1 || burn6h > 1) return "watch";
  return "healthy";
}

// ---------- alerts ----------

export type AlertLike = { severity: "page" | "ticket"; firedAt: string; ackMinutes: number; actionable: boolean };

/** Pages fired in the `days` before `now` (ISO times), share actionable, median time to acknowledge. */
export function alertStats(alerts: AlertLike[], now: string, days = 7) {
  const end = Date.parse(now);
  const start = end - days * MINUTES_PER_DAY * 60_000;
  const pages = alerts.filter((a) => {
    const t = Date.parse(a.firedAt);
    return a.severity === "page" && t > start && t <= end;
  });
  return {
    pages: pages.length,
    actionablePct: pages.length ? (pages.filter((a) => a.actionable).length / pages.length) * 100 : 0,
    medianAckMinutes: median(pages.map((a) => a.ackMinutes)),
  };
}

/** Whole minutes between two "HH:MM" times on the same day (or the next, if b is earlier). */
export function minutesBetween(a: string, b: string): number {
  const m = (t: string) => {
    const [h, min] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (min ?? 0);
  };
  const d = m(b) - m(a);
  return d >= 0 ? d : d + MINUTES_PER_DAY;
}

// ---------- 24-hour health series ----------

export type SeriesEvent = { from: string; to: string; latencyMs?: number; errorPct?: number };

export const POINTS_PER_DAY = 96; // one point every 15 minutes

function minuteOf(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** A small deterministic wobble in [-1, 1], so the charts look measured but never change between renders. */
export function wobble(seed: number, i: number): number {
  const x = Math.sin(seed * 9301 + i * 49297) * 233280;
  return (x - Math.floor(x)) * 2 - 1;
}

/**
 * p95 latency and error % every 15 minutes over a day. Busy hours (07:00 to
 * 19:00) run a little slower; events override values in their window.
 */
export function daySeries(baseMs: number, baseErrPct: number, events: SeriesEvent[], seed: number) {
  const latency: number[] = [];
  const errors: number[] = [];
  for (let i = 0; i < POINTS_PER_DAY; i++) {
    const minute = i * 15;
    const busy = minute >= 420 && minute < 1140 ? 1.1 : 0.95;
    let lat = baseMs * busy * (1 + 0.05 * wobble(seed, i));
    let err = Math.max(0, baseErrPct * (1 + 0.5 * wobble(seed + 1, i)));
    for (const e of events) {
      if (minute >= minuteOf(e.from) && minute < minuteOf(e.to)) {
        if (e.latencyMs !== undefined) lat = e.latencyMs;
        if (e.errorPct !== undefined) err = e.errorPct;
      }
    }
    latency.push(Math.round(lat));
    errors.push(Math.round(err * 1000) / 1000);
  }
  return { latency, errors };
}

/** Position of an "HH:MM" time across a day, 0 to 100. */
export function dayPct(t: string): number {
  return (minuteOf(t) / MINUTES_PER_DAY) * 100;
}

/** SVG polyline points for values across a width and height, scaled from `min` to `max`. */
export function linePoints(values: number[], w: number, h: number, min: number, max: number): string {
  const span = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const y = h - ((Math.min(Math.max(v, min), max) - min) / span) * h;
      return `${round1(i * step)},${round1(y)}`;
    })
    .join(" ");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------- quality ----------

export function passPct(passed: number, sampled: number): number {
  return sampled ? (passed / sampled) * 100 : 0;
}

// ---------- formatting ----------

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

export function formatUsd(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4).replace(/0+$/, "")}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export function formatPct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

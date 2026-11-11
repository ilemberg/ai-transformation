import {
  BASELINE_MONTHS,
  LAST_MONTH,
  METRICS,
  PHASES,
  SIGNALS,
  type Metric,
  type Phase,
  type Rule,
  type Target,
} from "./data";

/** Rounds away floating-point noise so 99.93 - 99.94 compares as -0.01. */
function tidy(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

export function clampMonth(month: number): number {
  if (!Number.isFinite(month)) return 0;
  return Math.min(LAST_MONTH, Math.max(0, Math.round(month)));
}

/** Reads the month from the `?m=` query value; anything unusable gives the fallback. */
export function parseMonth(raw: string | null | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) return fallback;
  return clampMonth(n);
}

export function valueAt(series: readonly number[], month: number): number {
  const v = series[clampMonth(month)];
  if (v === undefined) throw new Error(`No reading for month ${month}`);
  return v;
}

/** Baseline: the average of the baseline months. */
export function baselineOf(series: readonly number[], months: readonly number[] = BASELINE_MONTHS): number {
  const values = months.map((m) => valueAt(series, m));
  return tidy(values.reduce((a, b) => a + b, 0) / values.length);
}

export type Effect = "better" | "worse" | "same";

export type Delta = {
  /** Value minus baseline, in the metric's units. */
  diff: number;
  /** diff over baseline, as a percentage. */
  relative: number;
  direction: "up" | "down" | "flat";
  /** Better or worse beyond the metric's noise tolerance; "same" inside it. */
  effect: Effect;
  /** Moving the wrong way by more than half the tolerance, even if still inside it. */
  drifting: boolean;
};

type DeltaInput = Pick<Metric, "series" | "lowerIsBetter" | "tolerance">;

export function deltaVsBaseline(metric: DeltaInput, month: number): Delta {
  const base = baselineOf(metric.series);
  const diff = tidy(valueAt(metric.series, month) - base);
  const relative = base === 0 ? 0 : tidy((diff / base) * 100);
  const direction = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const goodDiff = metric.lowerIsBetter ? -diff : diff;
  const effect: Effect = goodDiff > metric.tolerance ? "better" : goodDiff < -metric.tolerance ? "worse" : "same";
  const drifting = effect === "worse" || goodDiff < -metric.tolerance / 2;
  return { diff, relative, direction, effect, drifting };
}

export type Verdict = "Healthy" | "Watch" | "Regression";

/**
 * The pair rule: a speed metric is never reported alone.
 * Speed better while its quality partner got worse than baseline is a regression,
 * however good the speed number looks.
 */
export function pairVerdict(
  speed: DeltaInput & { short: string },
  quality: DeltaInput & { short: string },
  month: number,
): { verdict: Verdict; reason: string } {
  const s = deltaVsBaseline(speed, month);
  const q = deltaVsBaseline(quality, month);
  const sName = speed.short.toLowerCase();
  const qName = quality.short.toLowerCase();

  if (q.effect === "worse") {
    if (s.effect === "better") {
      return { verdict: "Regression", reason: `${capital(sName)} improved, but ${qName} is worse than baseline.` };
    }
    return { verdict: "Watch", reason: `${capital(qName)} is worse than baseline without a speed gain to show for it.` };
  }
  if (s.effect === "worse") {
    return { verdict: "Watch", reason: `${capital(sName)} is worse than baseline.` };
  }
  if (q.drifting) {
    return { verdict: "Watch", reason: `${capital(qName)} is drifting the wrong way, still inside noise.` };
  }
  if (s.effect === "better") {
    return { verdict: "Healthy", reason: `${capital(sName)} improved and ${qName} is no worse.` };
  }
  return { verdict: "Healthy", reason: `Both hold at baseline.` };
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function phaseFor(month: number, phases: readonly Phase[] = PHASES): Phase {
  const m = clampMonth(month);
  const phase = phases.find((p) => m >= p.start && m <= p.end);
  if (!phase) throw new Error(`No phase covers month ${m}`);
  return phase;
}

export type SeriesLookup = (id: string) => readonly number[];

const SIGNAL_SERIES: Record<string, readonly number[]> = SIGNALS;

/** Finds a series by id among the scorecard metrics and the extra signals. */
export const lookupSeries: SeriesLookup = (id) => {
  const metric = METRICS.find((m) => m.id === id);
  if (metric) return metric.series;
  const signal = SIGNAL_SERIES[id];
  if (signal) return signal;
  throw new Error(`Unknown series "${id}"`);
};

export function ruleFiresAt(rule: Pick<Rule, "test">, month: number, lookup: SeriesLookup = lookupSeries): boolean {
  const t = rule.test;
  switch (t.kind) {
    case "aboveBaseline": {
      const series = lookup(t.metric);
      return tidy(valueAt(series, month) - baselineOf(series)) > t.margin;
    }
    case "above":
      return valueAt(lookup(t.series), month) > t.threshold;
    case "below":
      return valueAt(lookup(t.series), month) < t.threshold;
    case "aboveSeries":
      return valueAt(lookup(t.series), month) > valueAt(lookup(t.other), month);
  }
}

/** Every month from 0 to `upTo` in which the rule's condition held. */
export function firedMonths(
  rule: Pick<Rule, "test">,
  upTo: number,
  lookup: SeriesLookup = lookupSeries,
): number[] {
  const out: number[] = [];
  for (let m = 0; m <= clampMonth(upTo); m++) if (ruleFiresAt(rule, m, lookup)) out.push(m);
  return out;
}

export type RuleStatus =
  | { state: "idle" }
  | { state: "active"; firstFired: number; since: number }
  | { state: "cleared"; firstFired: number; clearedAt: number };

/** Where a rule stands as seen from `month`: never fired, firing now, or fired and since cleared. */
export function ruleStatus(rule: Pick<Rule, "test">, month: number, lookup: SeriesLookup = lookupSeries): RuleStatus {
  const fired = firedMonths(rule, month, lookup);
  const first = fired[0];
  const last = fired[fired.length - 1];
  if (first === undefined || last === undefined) return { state: "idle" };
  const m = clampMonth(month);
  if (last === m) {
    let since = m;
    while (fired.includes(since - 1)) since--;
    return { state: "active", firstFired: first, since };
  }
  return { state: "cleared", firstFired: first, clearedAt: last + 1 };
}

export function meetsTarget(target: Target | undefined, value: number): boolean | null {
  if (!target) return null;
  return target.op === "<=" ? value <= target.value : value >= target.value;
}

type FormatInput = Pick<Metric, "prefix" | "suffix" | "decimals">;

export function formatValue(metric: FormatInput, value: number): string {
  return `${metric.prefix ?? ""}${value.toFixed(metric.decimals)}${metric.suffix}`;
}

/** Signed change against baseline, e.g. "−29%" or "+2.6 pts". Uses a real minus sign. */
export function formatDelta(
  metric: Pick<Metric, "deltaMode" | "deltaUnit" | "decimals" | "prefix">,
  delta: Delta,
): string {
  if (delta.direction === "flat") return "no change";
  const sign = delta.diff > 0 ? "+" : "−";
  if (metric.deltaMode === "relative") {
    return `${sign}${Math.abs(delta.relative).toFixed(0)}%`;
  }
  return `${sign}${metric.prefix ?? ""}${Math.abs(delta.diff).toFixed(metric.decimals)}${metric.deltaUnit ?? ""}`;
}

export function formatTarget(metric: FormatInput & { target?: Target }): string {
  if (!metric.target) return "—";
  return `${metric.target.op === "<=" ? "≤" : "≥"} ${formatValue(metric, metric.target.value)}`;
}

export function metricById(id: string): Metric {
  const metric = METRICS.find((m) => m.id === id);
  if (!metric) throw new Error(`Unknown metric "${id}"`);
  return metric;
}

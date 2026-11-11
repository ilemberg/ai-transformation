/*
 * Numbers the gadgets show that are not stored as series, derived from
 * Bookwell's monthly metrics.
 */
import { MONTHS, TIER_SHARES, type TierShare } from "@/features/metrics/data";
import {
  AI_BUDGET,
  ESCAPED_BY_SEVERITY,
  PAYROLL_PER_MONTH,
  SEVERITIES,
  TEAMS as TEAM_LIST,
  shippedTotal,
  spendShareByTeam,
  type Severity,
  type TeamId,
} from "@/features/metrics/delivery";
import { clampMonth, metricById, valueAt } from "@/features/metrics/logic";

export const TEAMS = 6;
export const ENGINEERS = 40;
export const WEEKS_PER_MONTH = 4.33;

/**
 * Relative price per token by model size. A large-model token costs about
 * twelve small-model tokens, so dollars are split by token share weighted by
 * price, not by token share alone.
 */
export const TIER_PRICE: Readonly<TierShare> = { small: 1, medium: 3, large: 12 };

/** 99.9% over 30 days. */
export const SLO = 99.9;
export const BUDGET_MINUTES = 30 * 24 * 60 * (1 - SLO / 100);

/** Monthly AI spend in dollars: spend per change × changes per team per week × teams × weeks. */
export function monthlySpend(month: number): number {
  const perChange = valueAt(metricById("spend").series, month);
  const throughput = valueAt(metricById("throughput").series, month);
  return perChange * throughput * TEAMS * WEEKS_PER_MONTH;
}

/** Monthly AI spend per engineer. */
export function spendPerEngineer(month: number): number {
  return monthlySpend(month) / ENGINEERS;
}

export type TierSpend = TierShare & { total: number };

/** The month's spend split by model size: that month's token share, weighted by price per token. */
export function spendByTier(month: number): TierSpend {
  const total = monthlySpend(month);
  const share = TIER_SHARES[month] ?? { small: 0, medium: 0, large: 0 };
  const weight = {
    small: share.small * TIER_PRICE.small,
    medium: share.medium * TIER_PRICE.medium,
    large: share.large * TIER_PRICE.large,
  };
  const sum = weight.small + weight.medium + weight.large;
  if (sum === 0) return { small: 0, medium: 0, large: 0, total };
  return {
    small: (total * weight.small) / sum,
    medium: (total * weight.medium) / sum,
    large: (total * weight.large) / sum,
    total,
  };
}

export type ErrorBudget = { budget: number; used: number; left: number; leftShare: number };

/** Error budget over 30 days from an uptime percentage. Used is capped at the budget's size. */
export function errorBudget(uptimePct: number): ErrorBudget {
  const downtime = Math.max(0, ((100 - uptimePct) / 100) * 30 * 24 * 60);
  const used = Math.min(BUDGET_MINUTES, downtime);
  const left = BUDGET_MINUTES - used;
  return { budget: BUDGET_MINUTES, used, left, leftShare: left / BUDGET_MINUTES };
}

/** "$2,899" or "$2.9k" for chart labels. */
export function formatDollars(usd: number, compact = false): string {
  if (compact && usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
  return `$${Math.round(usd).toLocaleString("en-US")}`;
}

// ------------------------------------------------------------ for executives

/** Monthly AI spend for every month of the year, month 0 to 12. */
export function spendSeries(): number[] {
  return Array.from({ length: MONTHS }, (_, m) => monthlySpend(m));
}

/** Tickets that reached customers per month, all types together. */
export function shippedSeries(): number[] {
  return Array.from({ length: MONTHS }, (_, m) => shippedTotal(m));
}

/** Tickets that reached customers per engineer in the month. */
export function shippedPerEngineer(month: number): number {
  return shippedTotal(month) / ENGINEERS;
}

/** AI spend over tickets that reached customers in the same month. */
export function costPerShipped(month: number): number {
  const shipped = shippedTotal(month);
  return shipped === 0 ? 0 : monthlySpend(month) / shipped;
}

/** AI spend as a share of fully loaded engineering payroll, in percent. */
export function payrollShare(month: number): number {
  return (monthlySpend(month) / PAYROLL_PER_MONTH) * 100;
}

export type BudgetCheck = { spend: number; budget: number; diff: number; usedShare: number; over: boolean };

/** The month's spend against the budget agreed with finance. `diff` is spend minus budget. */
export function budgetCheck(month: number): BudgetCheck {
  const spend = monthlySpend(month);
  const budget = valueAt(AI_BUDGET, month);
  return { spend, budget, diff: spend - budget, usedShare: budget === 0 ? 0 : spend / budget, over: spend > budget };
}

export type PeakChange = { peak: number; peakMonth: number; relative: number; atPeak: boolean };

/**
 * The selected month against the highest reading so far (months 0 to the
 * selected one). Null for months 0 and 1, the autocomplete-only baseline,
 * when there is no rollout peak to compare with. `relative` is in percent.
 */
export function fromPeak(series: readonly number[], month: number): PeakChange | null {
  const m = clampMonth(month);
  if (m < 2) return null;
  const sofar = series.slice(0, m + 1);
  const peak = Math.max(...sofar);
  const peakMonth = sofar.indexOf(peak);
  const now = series[m] ?? 0;
  const relative = peak === 0 ? 0 : ((now - peak) / peak) * 100;
  return { peak, peakMonth, relative, atPeak: peakMonth === m };
}

/** Spend and budget added up from month 0 to the selected month. */
export function budgetToDate(month: number): { spend: number; budget: number } {
  let spend = 0;
  let budget = 0;
  for (let m = 0; m <= clampMonth(month); m++) {
    spend += monthlySpend(m);
    budget += AI_BUDGET[m] ?? 0;
  }
  return { spend, budget };
}

export type TeamSpend = { id: TeamId; name: string; engineers: number; joined: number; spend: number; share: number };

/** The month's spend split by team, largest first. */
export function spendByTeam(month: number): TeamSpend[] {
  const total = monthlySpend(month);
  const shares = spendShareByTeam(clampMonth(month));
  return TEAM_LIST.map((t) => ({
    id: t.id,
    name: t.name,
    engineers: t.engineers,
    joined: t.joined,
    share: shares[t.id],
    spend: total * shares[t.id],
  })).sort((a, b) => b.spend - a.spend);
}

export type Forecast = {
  /** The months projected: the three after the selected one. */
  months: readonly number[];
  /** Change per month from a straight line through the last three months. */
  slope: number;
  /** Projected spend for each of the three months, never below zero. */
  trend: readonly number[];
  /** Quarter total if the trend carries on. */
  central: number;
  /** Quarter total if spend holds at the selected month's level. */
  flat: number;
  /** The range: from the lower of trend and flat less 10% to the higher plus 10%. */
  low: number;
  high: number;
  /** Agreed budget for those months, when all three fall inside the year. */
  budget: number | null;
};

/** Least-squares slope of y against 0, 1, 2…; zero for fewer than two points. */
export function slopeOf(ys: readonly number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  return num / den;
}

export const FORECAST_MARGIN = 0.1;

/**
 * Next quarter's AI spend as seen from the selected month: a straight line
 * through the last three months (fewer at the start of the year), carried
 * three months on, next to spend holding flat. The range spans both, with a
 * 10% margin either side.
 */
export function forecastQuarter(month: number, series: readonly number[] = spendSeries()): Forecast {
  const m = Math.min(series.length - 1, Math.max(0, Math.round(month)));
  const window = series.slice(Math.max(0, m - 2), m + 1);
  const slope = slopeOf(window);
  const last = series[m] ?? 0;
  const months = [m + 1, m + 2, m + 3];
  const trend = months.map((_, i) => Math.max(0, last + slope * (i + 1)));
  const central = trend.reduce((a, b) => a + b, 0);
  const flat = last * 3;
  const low = Math.min(central, flat) * (1 - FORECAST_MARGIN);
  const high = Math.max(central, flat) * (1 + FORECAST_MARGIN);
  const inYear = months.every((x) => x < AI_BUDGET.length);
  const budget = inYear ? months.reduce((n, x) => n + (AI_BUDGET[x] ?? 0), 0) : null;
  return { months, slope, trend, central, flat, low, high, budget };
}

export type Incidents = Record<Severity, number> & { total: number };

/** Customer-facing bugs found in the month, by severity. */
export function incidentsAt(month: number): Incidents {
  const m = clampMonth(month);
  const counts = Object.fromEntries(SEVERITIES.map((s) => [s, ESCAPED_BY_SEVERITY[s][m] ?? 0])) as Record<Severity, number>;
  return { ...counts, total: SEVERITIES.reduce((n, s) => n + counts[s], 0) };
}

/** Customer-facing bugs per month, all severities. */
export function incidentSeries(): number[] {
  return Array.from({ length: MONTHS }, (_, m) => incidentsAt(m).total);
}

/*
 * Numbers the gadgets show that are not stored as series: derived from the
 * sample metrics. Everything here is sample data.
 */
import { TIER_SHARES, type TierShare } from "@/features/metrics/data";
import { metricById, valueAt } from "@/features/metrics/logic";

export const TEAMS = 6;
export const WEEKS_PER_MONTH = 4.33;

/** 99.9% over 30 days. */
export const SLO = 99.9;
export const BUDGET_MINUTES = 30 * 24 * 60 * (1 - SLO / 100);

/** Monthly AI spend in dollars: spend per change × changes per team per week × teams × weeks. */
export function monthlySpend(month: number): number {
  const perChange = valueAt(metricById("spend").series, month);
  const throughput = valueAt(metricById("throughput").series, month);
  return perChange * throughput * TEAMS * WEEKS_PER_MONTH;
}

export type TierSpend = TierShare & { total: number };

/** The month's spend split by model size, using that month's token share. */
export function spendByTier(month: number): TierSpend {
  const total = monthlySpend(month);
  const share = TIER_SHARES[month] ?? { small: 0, medium: 0, large: 0 };
  return {
    small: (total * share.small) / 100,
    medium: (total * share.medium) / 100,
    large: (total * share.large) / 100,
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

/*
 * Numbers the gadgets show that are not stored as series, derived from
 * Bookwell's monthly metrics.
 */
import { TIER_SHARES, type TierShare } from "@/features/metrics/data";
import { metricById, valueAt } from "@/features/metrics/logic";

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

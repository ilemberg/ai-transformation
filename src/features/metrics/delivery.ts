/*
 * The detail behind the headline metrics, shared by Engineering reports and
 * the Executive dashboard: where cycle time goes, which teams are in the
 * rollout, what shipped, what reached customers, what each gate caught, and
 * the budget the AI spend is held against. Thirteen monthly readings each,
 * month 0 to month 12, consistent with the series in data.ts.
 */
import { METRICS } from "./data";

const series = (id: string): readonly number[] => {
  const m = METRICS.find((x) => x.id === id);
  if (!m) throw new Error(`No metric ${id}`);
  return m.series;
};

// ---------------------------------------------------------------- cycle time

export const STAGES = ["plan", "build", "review", "gates", "release"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  plan: "Plan and spec",
  build: "Build",
  review: "Waiting for review",
  gates: "Pipeline gates",
  release: "Release",
};

/**
 * Hours in each stage. Build shrinks first (agents), review waiting swells in
 * months 4-5 when agent output outran reviewers, then shrinks after smaller
 * changes and a first-pass AI review. Release takes whatever is left, so the
 * stages always add up to the cycle time in data.ts.
 */
const PLAN = [8, 8, 8, 7.5, 7.5, 7, 7, 6.5, 6.5, 6.5, 6, 6, 6];
const BUILD = [18, 18, 15, 13, 11, 10.5, 10.5, 10, 9.5, 9.5, 9, 9, 9];
const REVIEW = [16, 16, 17, 18, 22, 23, 18, 16, 14.5, 13.5, 12.5, 12, 11];
const GATES = [4, 4, 4, 4.5, 4.5, 4.5, 5, 5, 5, 5, 5, 5, 5];

export function cycleStages(month: number): Record<Stage, number> {
  const total = series("cycleTime")[month];
  const plan = PLAN[month];
  const build = BUILD[month];
  const review = REVIEW[month];
  const gates = GATES[month];
  return { plan, build, review, gates, release: Math.max(0, total - plan - build - review - gates) };
}

// --------------------------------------------------------------------- teams

export type TeamId = "search" | "rebooking" | "booking" | "payments" | "platform" | "mobile";

export interface Team {
  id: TeamId;
  name: string;
  /** Month the team joined the rollout. */
  joined: number;
  engineers: number;
}

export const TEAMS: readonly Team[] = [
  { id: "search", name: "Search", joined: 2, engineers: 7 },
  { id: "rebooking", name: "Rebooking", joined: 2, engineers: 6 },
  { id: "booking", name: "Booking", joined: 4, engineers: 8 },
  { id: "payments", name: "Payments", joined: 6, engineers: 6 },
  { id: "platform", name: "Platform", joined: 6, engineers: 7 },
  { id: "mobile", name: "Mobile", joined: 4, engineers: 6 },
];

export const PILOT_TEAMS: readonly TeamId[] = ["search", "rebooking"];

/**
 * Median cycle time in hours for the two pilot teams and for the other four,
 * which only start their rollout in months 4 and 6. The comparison shows how much
 * of the change is the rollout and how much would have happened anyway.
 */
export const COHORT_CYCLE = {
  pilot: [52, 52, 45, 40, 42, 41, 37, 34, 33, 32, 31, 30, 30],
  others: [52, 52, 52, 52, 54, 53, 51, 49, 46, 45, 43, 42, 41],
} as const;

/** Share of AI spend by team; a team spends nothing before it joins, beyond editor autocomplete. */
export function spendShareByTeam(month: number): Record<TeamId, number> {
  const weights = Object.fromEntries(
    TEAMS.map((t) => [t.id, month >= t.joined ? t.engineers * (month - t.joined < 2 ? 1.3 : 1) : t.engineers * 0.15]),
  ) as Record<TeamId, number>;
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Object.fromEntries(TEAMS.map((t) => [t.id, weights[t.id] / sum])) as Record<TeamId, number>;
}

// ------------------------------------------------------------------ shipped

export const WORK_TYPES = ["features", "fixes", "performance", "maintenance"] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const WORK_LABEL: Record<WorkType, string> = {
  features: "Features",
  fixes: "Bug fixes",
  performance: "Performance",
  maintenance: "Maintenance",
};

/** Tickets that reached customers each month, by type, across all six teams. */
export const SHIPPED: Record<WorkType, readonly number[]> = {
  features: [22, 22, 23, 25, 24, 25, 27, 29, 30, 31, 32, 33, 34],
  fixes: [48, 47, 48, 47, 55, 57, 50, 48, 49, 50, 50, 51, 52],
  performance: [6, 6, 6, 7, 7, 6, 8, 8, 9, 9, 9, 10, 10],
  maintenance: [30, 31, 31, 32, 30, 31, 33, 35, 36, 36, 37, 38, 38],
};

export function shippedTotal(month: number): number {
  return WORK_TYPES.reduce((n, t) => n + SHIPPED[t][month], 0);
}

/** Days from a ticket being accepted to it being live for every customer, median. */
export const REQUEST_TO_LIVE_DAYS = [19, 19, 18.5, 18, 19.5, 19, 17, 16, 15.5, 15, 14, 13.5, 13];

// ----------------------------------------------------------------- quality

export const SEVERITIES = ["sev1", "sev2", "sev3"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABEL: Record<Severity, string> = {
  sev1: "Sev 1 (customers blocked)",
  sev2: "Sev 2 (feature broken)",
  sev3: "Sev 3 (minor)",
};

/** Bugs first found by customers or in production, per month. */
export const ESCAPED_BY_SEVERITY: Record<Severity, readonly number[]> = {
  sev1: [1, 1, 1, 0, 2, 2, 1, 0, 1, 0, 0, 1, 0],
  sev2: [4, 4, 4, 4, 6, 7, 5, 4, 4, 3, 3, 3, 3],
  sev3: [11, 11, 11, 10, 12, 13, 11, 10, 10, 10, 9, 9, 9],
};

export const GATE_KINDS = ["review", "tests", "evals", "stress", "canary"] as const;
export type GateKind = (typeof GATE_KINDS)[number];

export const GATE_LABEL: Record<GateKind, string> = {
  review: "Model and human review",
  tests: "Tests and pipeline gates",
  evals: "Evals",
  stress: "Load and break-it",
  canary: "Canary rollback",
};

/**
 * Problems stopped before they reached all customers, per month. Evals and
 * break-it testing only exist from the pilot on; canary rollbacks from month 3.
 */
export const CAUGHT: Record<GateKind, readonly number[]> = {
  review: [34, 34, 39, 44, 58, 63, 57, 55, 56, 57, 58, 59, 60],
  tests: [41, 41, 47, 53, 61, 64, 66, 68, 69, 71, 72, 73, 74],
  evals: [0, 0, 3, 5, 7, 8, 9, 9, 14, 10, 10, 11, 11],
  stress: [0, 0, 2, 4, 6, 7, 8, 9, 9, 10, 10, 11, 11],
  canary: [0, 0, 0, 1, 3, 3, 2, 2, 2, 2, 1, 2, 1],
};

export function caughtTotal(month: number): number {
  return GATE_KINDS.reduce((n, g) => n + CAUGHT[g][month], 0);
}

/** Share of all problems found that were stopped before reaching every customer. */
export function containment(month: number): number {
  const escaped = SEVERITIES.reduce((n, s) => n + ESCAPED_BY_SEVERITY[s][month], 0);
  const caught = caughtTotal(month);
  return caught / (caught + escaped);
}

// -------------------------------------------------------------------- money

/** Monthly AI budget agreed with finance: a small allowance at baseline, then the rollout budget. */
export const AI_BUDGET = [1_000, 1_000, 12_000, 12_000, 15_000, 15_000, 15_000, 15_000, 14_000, 14_000, 13_000, 13_000, 12_000];

/** Fully loaded engineering payroll per month for about forty engineers. */
export const PAYROLL_PER_MONTH = 640_000;

/** Marks on the timeline: what changed, and when. */
export const CHANGES: readonly { month: number; label: string }[] = [
  { month: 2, label: "Pilot: Search and Rebooking" },
  { month: 4, label: "Booking and Mobile join; review queue builds" },
  { month: 5, label: "Change failure rule pauses expansion" },
  { month: 6, label: "Payments and Platform join; size cap and AI first-pass review" },
  { month: 7, label: "Model routing by job" },
  { month: 8, label: "Model upgrade held back by evals" },
];

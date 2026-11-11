import type { Layout, Width } from "./layout";

/** Every gadget the dashboard can show. The bodies live in components/GadgetBodies.tsx. */
export const GADGET_IDS = [
  // Getting done
  "shipped",
  "requestToLive",
  "shippedPerEngineer",
  "velocity",
  // Spend
  "aiBudget",
  "costPerTicket",
  "spendByTeam",
  "tokenSpend",
  "payrollShare",
  "forecast",
  // Risk
  "risk",
  // Engineering detail: addable, not on the default dashboard
  "cycleTime",
  "release",
  "health",
  "errorBudget",
  "adoption",
  "rules",
  "evals",
  "costPerChange",
  "phase",
  "tickets",
] as const;

export type GadgetId = (typeof GADGET_IDS)[number];

export const GROUPS = ["done", "spend", "risk", "engineering"] as const;
export type GadgetGroup = (typeof GROUPS)[number];

export const GROUP_LABEL: Record<GadgetGroup, string> = {
  done: "Getting done",
  spend: "Spend",
  risk: "Risk",
  engineering: "Engineering detail",
};

export type GadgetInfo = {
  id: GadgetId;
  title: string;
  /** One line for the Add gadget dialog. */
  description: string;
  group: GadgetGroup;
  defaultWidth: Width;
  /** Extra footer text, e.g. how a derived number was worked out. */
  footnote?: string;
  /** False for a gadget that does not follow the month picker (it shows the Board as it is now). */
  monthly?: boolean;
};

export const GADGETS: Record<GadgetId, GadgetInfo> = {
  shipped: {
    id: "shipped",
    title: "Shipped this month",
    description: "Tickets that reached customers, by type, over the year.",
    group: "done",
    defaultWidth: 2,
    footnote: "Tickets live for customers, all six teams",
  },
  requestToLive: {
    id: "requestToLive",
    title: "Request to live",
    description: "Median days from a request being accepted to it being live for every customer.",
    group: "done",
    defaultWidth: 1,
  },
  shippedPerEngineer: {
    id: "shippedPerEngineer",
    title: "Shipped per engineer",
    description: "Tickets that reached customers per engineer per month.",
    group: "done",
    defaultWidth: 1,
    footnote: "Shipped tickets ÷ 40 engineers",
  },
  velocity: {
    id: "velocity",
    title: "Velocity",
    description: "Merged changes per team per week, against the baseline.",
    group: "done",
    defaultWidth: 1,
  },
  aiBudget: {
    id: "aiBudget",
    title: "AI spend vs budget",
    description: "Monthly AI spend against the budget agreed with finance.",
    group: "spend",
    defaultWidth: 2,
    footnote: "Budget agreed with finance per month",
  },
  costPerTicket: {
    id: "costPerTicket",
    title: "Cost per shipped ticket",
    description: "AI spend for the month over tickets that reached customers.",
    group: "spend",
    defaultWidth: 1,
    footnote: "Monthly AI spend ÷ shipped tickets",
  },
  spendByTeam: {
    id: "spendByTeam",
    title: "Spend by team",
    description: "The month's AI spend split across the six teams.",
    group: "spend",
    defaultWidth: 1,
    footnote: "Split by team size and when each team joined",
  },
  tokenSpend: {
    id: "tokenSpend",
    title: "Spend by model size",
    description: "Monthly AI spend in dollars, stacked by small, medium and large models.",
    group: "spend",
    defaultWidth: 2,
    footnote: "Spend per change × throughput × 6 teams × 4.33 weeks; split by token share weighted by price (1 : 3 : 12)",
  },
  payrollShare: {
    id: "payrollShare",
    title: "Share of payroll",
    description: "AI spend as a share of the monthly engineering payroll.",
    group: "spend",
    defaultWidth: 1,
    footnote: "Fully loaded payroll, about 40 engineers",
  },
  forecast: {
    id: "forecast",
    title: "Forecast next quarter",
    description: "AI spend for the next three months, projected from the last three.",
    group: "spend",
    defaultWidth: 1,
    footnote: "Trend of the last 3 months vs holding flat, ±10%",
  },
  risk: {
    id: "risk",
    title: "Uptime and incidents",
    description: "Uptime against the 99.9% SLO and customer-facing bugs by severity.",
    group: "risk",
    defaultWidth: 2,
    footnote: "Bugs first found by customers or in production",
  },
  cycleTime: {
    id: "cycleTime",
    title: "Cycle time",
    description: "Median hours from first commit to production.",
    group: "engineering",
    defaultWidth: 1,
  },
  release: {
    id: "release",
    title: "Deploys and change failures",
    description: "Deploy frequency next to change failure rate, with the pair verdict.",
    group: "engineering",
    defaultWidth: 1,
  },
  health: {
    id: "health",
    title: "Delivery health",
    description: "The four speed and quality pairs, each with its verdict, against the DORA 2024 finding.",
    group: "engineering",
    defaultWidth: 1,
  },
  errorBudget: {
    id: "errorBudget",
    title: "Uptime and error budget",
    description: "Uptime against the 99.9% SLO and the minutes of error budget left.",
    group: "engineering",
    defaultWidth: 1,
    footnote: "99.9% SLO over 30 days = 43 min budget",
  },
  adoption: {
    id: "adoption",
    title: "AI adoption",
    description: "Share of merged code written by agents, and how much of it is reworked.",
    group: "engineering",
    defaultWidth: 1,
  },
  rules: {
    id: "rules",
    title: "Decision rules",
    description: "Which rules are firing now, and which fired and cleared.",
    group: "engineering",
    defaultWidth: 1,
  },
  evals: {
    id: "evals",
    title: "Eval pass rate",
    description: "Eval pass rate against the release threshold.",
    group: "engineering",
    defaultWidth: 1,
  },
  costPerChange: {
    id: "costPerChange",
    title: "Cost per change",
    description: "AI spend per merged change and prompt-cache hit rate.",
    group: "engineering",
    defaultWidth: 1,
  },
  phase: {
    id: "phase",
    title: "Rollout phase",
    description: "The current rollout phase and progress through the year.",
    group: "engineering",
    defaultWidth: 1,
  },
  tickets: {
    id: "tickets",
    title: "Tickets in flight",
    description: "The tickets on the Board, with model spend and elapsed time end to end.",
    group: "engineering",
    defaultWidth: 2,
    footnote: "Tickets on the Board today · model spend and elapsed time, intake to production",
    monthly: false,
  },
};

export const GADGET_LIST: readonly GadgetInfo[] = GADGET_IDS.map((id) => GADGETS[id]);

export function isGadgetId(id: string): id is GadgetId {
  return (GADGET_IDS as readonly string[]).includes(id);
}

/**
 * The default dashboard, for executives and finance: what is getting done,
 * what it costs, and one glance at risk. On a three-column screen the widths
 * fill every row.
 */
export const DEFAULT_IDS: readonly GadgetId[] = [
  "shipped",
  "requestToLive",
  "shippedPerEngineer",
  "velocity",
  "costPerTicket",
  "aiBudget",
  "payrollShare",
  "tokenSpend",
  "spendByTeam",
  "forecast",
  "risk",
];

export const DEFAULT_LAYOUT: Layout = DEFAULT_IDS.map((id) => ({ id, width: GADGETS[id].defaultWidth }));

/** v2 holds the executive set; a layout saved under v1 is no longer read. */
export const STORAGE_KEY = "bookwell.dashboard.layout.v2";

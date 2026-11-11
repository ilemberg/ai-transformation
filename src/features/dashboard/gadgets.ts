import type { Layout, Width } from "./layout";

/** Every gadget the dashboard can show. The bodies live in components/GadgetBodies.tsx. */
export const GADGET_IDS = [
  "tokenSpend",
  "velocity",
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

export type GadgetInfo = {
  id: GadgetId;
  title: string;
  /** One line for the Add gadget dialog. */
  description: string;
  defaultWidth: Width;
  /** Extra footer text, e.g. how a derived number was worked out. */
  footnote?: string;
};

export const GADGETS: Record<GadgetId, GadgetInfo> = {
  tokenSpend: {
    id: "tokenSpend",
    title: "Token spend by model size",
    description: "Monthly AI spend in dollars, stacked by small, medium and large models.",
    defaultWidth: 2,
    footnote: "Spend per change × throughput × 6 teams × 4.33 weeks, split by token share",
  },
  velocity: {
    id: "velocity",
    title: "Velocity",
    description: "Merged changes per team per week, against the baseline.",
    defaultWidth: 1,
  },
  cycleTime: {
    id: "cycleTime",
    title: "Cycle time",
    description: "Median hours from first commit to production.",
    defaultWidth: 1,
  },
  release: {
    id: "release",
    title: "Deploys and change failures",
    description: "Deploy frequency next to change failure rate, with the pair verdict.",
    defaultWidth: 1,
  },
  health: {
    id: "health",
    title: "Delivery health",
    description: "The four speed and quality pairs, each with its verdict.",
    defaultWidth: 1,
  },
  errorBudget: {
    id: "errorBudget",
    title: "Uptime and error budget",
    description: "Uptime against the 99.9% SLO and the minutes of error budget left.",
    defaultWidth: 1,
    footnote: "99.9% SLO over 30 days = 43 min budget",
  },
  adoption: {
    id: "adoption",
    title: "AI adoption",
    description: "Share of merged code written by agents, and how much of it is reworked.",
    defaultWidth: 1,
  },
  rules: {
    id: "rules",
    title: "Decision rules",
    description: "Which rules are firing now, and which fired and cleared.",
    defaultWidth: 1,
  },
  evals: {
    id: "evals",
    title: "Eval pass rate",
    description: "Eval pass rate against the release threshold.",
    defaultWidth: 1,
  },
  costPerChange: {
    id: "costPerChange",
    title: "Cost per change",
    description: "AI spend per merged change and prompt-cache hit rate.",
    defaultWidth: 1,
  },
  phase: {
    id: "phase",
    title: "Rollout phase",
    description: "The current rollout phase and progress through the year.",
    defaultWidth: 1,
  },
  tickets: {
    id: "tickets",
    title: "Sample tickets",
    description: "The three sample tickets with model spend and elapsed time.",
    defaultWidth: 2,
  },
};

export const GADGET_LIST: readonly GadgetInfo[] = GADGET_IDS.map((id) => GADGETS[id]);

export function isGadgetId(id: string): id is GadgetId {
  return (GADGET_IDS as readonly string[]).includes(id);
}

const DEFAULT_IDS: readonly GadgetId[] = [
  "tokenSpend",
  "velocity",
  "cycleTime",
  "release",
  "health",
  "errorBudget",
  "adoption",
  "rules",
];

export const DEFAULT_LAYOUT: Layout = DEFAULT_IDS.map((id) => ({ id, width: GADGETS[id].defaultWidth }));

export const STORAGE_KEY = "bookwell.dashboard.layout.v1";

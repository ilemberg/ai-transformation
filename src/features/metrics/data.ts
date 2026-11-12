/*
 * Bookwell's delivery metrics over the twelve months of the AI rollout:
 * six product teams, about forty engineers.
 *
 * Each series has 13 readings: month 0 to month 12. A month's reading is the
 * trailing four weeks for that team-level metric, rolled up across all six
 * teams, so the pilot (two teams) moves the roll-up only a little.
 */

export const MONTHS = 13;
export const LAST_MONTH = MONTHS - 1;

/** Months whose readings are averaged to make the baseline. */
export const BASELINE_MONTHS: readonly number[] = [0, 1];

export type GroupId = "speed" | "stability" | "ai" | "cost" | "people";

export const GROUPS: readonly { id: GroupId; label: string; note?: string }[] = [
  { id: "speed", label: "Delivery speed" },
  { id: "stability", label: "Stability" },
  { id: "ai", label: "AI effectiveness" },
  { id: "cost", label: "Cost" },
  { id: "people", label: "People", note: "Reported per team, never per person." },
];

/** Which side of a pair a metric sits on; drives its colour (blue or green). */
export type MetricKind = "speed" | "quality" | "other";

export type Target = { op: "<=" | ">="; value: number };

export type Metric = {
  id: string;
  group: GroupId;
  kind: MetricKind;
  name: string;
  /** Short name for cards and charts. */
  short: string;
  definition: string;
  lowerIsBetter: boolean;
  /** Changes smaller than this (in the metric's own units) are noise. */
  tolerance: number;
  /** How the change against baseline is shown: as a percentage, or in units. */
  deltaMode: "relative" | "absolute";
  /** Unit shown after an absolute change, e.g. " pts" or " h". */
  deltaUnit?: string;
  prefix?: string;
  suffix: string;
  decimals: number;
  target?: Target;
  /**
   * Context, not a goal: shown without better or worse. More agent-written
   * code is not an outcome in itself, so it is never scored.
   */
  descriptive?: boolean;
  /** A line drawn on the sparkline, e.g. the SLO or a release threshold. */
  threshold?: { value: number; label: string };
  series: readonly number[];
};

export const METRICS: readonly Metric[] = [
  // Delivery speed
  {
    id: "cycleTime",
    group: "speed",
    kind: "speed",
    name: "Coding cycle time (median)",
    short: "Cycle time",
    definition: "First commit to running in production, median across merged changes.",
    lowerIsBetter: true,
    tolerance: 2,
    deltaMode: "relative",
    suffix: " h",
    decimals: 0,
    target: { op: "<=", value: 40 },
    series: [52, 52, 50, 48, 50, 49, 46, 44, 42, 41, 39, 38, 37],
  },
  {
    id: "deployFreq",
    group: "speed",
    kind: "speed",
    name: "Deploy frequency",
    short: "Deploys",
    definition: "Production deploys per service per week.",
    lowerIsBetter: false,
    tolerance: 0.2,
    deltaMode: "relative",
    suffix: " / svc / wk",
    decimals: 1,
    target: { op: ">=", value: 4.5 },
    series: [3.1, 3.1, 3.3, 3.5, 3.6, 3.4, 3.7, 3.9, 3.8, 4.1, 4.3, 4.5, 4.7],
  },
  {
    id: "reviewLatency",
    group: "speed",
    kind: "speed",
    name: "Review latency (p90)",
    short: "Review latency",
    definition: "Pull request opened to first human approval, 90th percentile.",
    lowerIsBetter: true,
    tolerance: 1,
    deltaMode: "relative",
    suffix: " h",
    decimals: 0,
    target: { op: "<=", value: 24 },
    threshold: { value: 24, label: "1 day" },
    series: [20, 20, 21, 22, 27, 30, 23, 19, 18, 18, 17, 17, 16],
  },
  {
    id: "prSize",
    group: "speed",
    kind: "other",
    name: "PR size (median)",
    short: "PR size",
    definition: "Lines changed per merged pull request, median. Generated files excluded.",
    lowerIsBetter: true,
    tolerance: 10,
    deltaMode: "relative",
    suffix: " lines",
    decimals: 0,
    target: { op: "<=", value: 200 },
    series: [210, 210, 240, 270, 360, 390, 230, 190, 180, 175, 170, 165, 160],
  },

  // Stability
  {
    id: "uptime",
    group: "stability",
    kind: "quality",
    name: "Uptime against SLO",
    short: "Uptime",
    definition: "Successful booking requests over all requests. SLO is 99.9%; the gap is the error budget.",
    lowerIsBetter: false,
    tolerance: 0.02,
    deltaMode: "absolute",
    deltaUnit: " pts",
    suffix: "%",
    decimals: 2,
    target: { op: ">=", value: 99.9 },
    threshold: { value: 99.9, label: "SLO" },
    series: [99.93, 99.93, 99.94, 99.93, 99.91, 99.86, 99.92, 99.93, 99.93, 99.94, 99.94, 99.95, 99.95],
  },
  {
    id: "cfr",
    group: "stability",
    kind: "quality",
    name: "Change failure rate",
    short: "Change failure rate",
    definition: "Share of deploys that cause an incident, a rollback or a hotfix.",
    lowerIsBetter: true,
    tolerance: 0.5,
    deltaMode: "absolute",
    deltaUnit: " pts",
    suffix: "%",
    decimals: 1,
    target: { op: "<=", value: 11 },
    series: [12, 12, 12.2, 11.9, 15.1, 15.8, 12.4, 11.8, 11.6, 11.2, 10.9, 10.6, 10.4],
  },
  {
    id: "mttr",
    group: "stability",
    kind: "other",
    name: "Time to restore (median)",
    short: "Time to restore",
    definition: "Incident opened to service restored, median.",
    lowerIsBetter: true,
    tolerance: 3,
    deltaMode: "relative",
    suffix: " min",
    decimals: 0,
    target: { op: "<=", value: 45 },
    series: [58, 58, 56, 55, 57, 66, 52, 49, 48, 46, 45, 44, 43],
  },
  {
    id: "escaped",
    group: "stability",
    kind: "other",
    name: "Escaped defects",
    short: "Escaped defects",
    definition: "Bugs found in production per 100 merged changes.",
    lowerIsBetter: true,
    tolerance: 0.2,
    deltaMode: "relative",
    suffix: " / 100",
    decimals: 1,
    target: { op: "<=", value: 2.8 },
    series: [3.2, 3.2, 3.2, 3.1, 3.7, 3.9, 3.3, 3.0, 3.1, 2.9, 2.8, 2.7, 2.7],
  },

  // AI effectiveness
  {
    id: "agentShare",
    group: "ai",
    kind: "other",
    descriptive: true,
    name: "Agent-authored share",
    short: "Agent-authored share",
    definition: "Share of merged lines first written by an agent, then reviewed by a person.",
    lowerIsBetter: false,
    tolerance: 2,
    deltaMode: "absolute",
    deltaUnit: " pts",
    suffix: "%",
    decimals: 0,
    series: [3, 3, 9, 14, 24, 31, 33, 36, 38, 41, 43, 45, 46],
  },
  {
    id: "firstPass",
    group: "ai",
    kind: "other",
    name: "First-pass rate",
    short: "First-pass rate",
    definition: "Agent pull requests merged without a person rewriting the change.",
    lowerIsBetter: false,
    tolerance: 2,
    deltaMode: "absolute",
    deltaUnit: " pts",
    suffix: "%",
    decimals: 0,
    target: { op: ">=", value: 60 },
    series: [38, 38, 44, 49, 46, 43, 52, 58, 55, 61, 63, 65, 66],
  },
  {
    id: "rework",
    group: "ai",
    kind: "quality",
    name: "Rework rate (agent code)",
    short: "Rework rate",
    definition: "Share of agent-written lines rewritten or deleted within 21 days of merge.",
    lowerIsBetter: true,
    tolerance: 0.4,
    deltaMode: "absolute",
    deltaUnit: " pts",
    suffix: "%",
    decimals: 1,
    target: { op: "<=", value: 8 },
    series: [7.6, 7.6, 7.9, 7.8, 10.8, 11.6, 9.1, 7.7, 7.5, 7.3, 7.1, 6.9, 6.8],
  },
  {
    id: "evalPass",
    group: "ai",
    kind: "other",
    name: "Eval pass rate",
    short: "Eval pass rate",
    definition: "Share of the eval suite (booking assistant and agent prompts) passing on the release candidate.",
    lowerIsBetter: false,
    tolerance: 1,
    deltaMode: "absolute",
    deltaUnit: " pts",
    suffix: "%",
    decimals: 0,
    target: { op: ">=", value: 92 },
    threshold: { value: 92, label: "release" },
    series: [93, 93, 93, 94, 93, 92, 93, 94, 89, 93, 94, 94, 95],
  },

  // Cost
  {
    id: "spend",
    group: "cost",
    kind: "other",
    name: "AI spend per merged change",
    short: "AI spend / change",
    definition: "Model, sandbox and eval spend for the month over merged changes. Baseline is autocomplete only.",
    lowerIsBetter: true,
    tolerance: 0.5,
    deltaMode: "absolute",
    deltaUnit: "",
    prefix: "$",
    suffix: "",
    decimals: 2,
    target: { op: "<=", value: 25 },
    series: [2.1, 2.1, 12, 18, 38, 36, 33, 29, 30, 26, 24, 23, 22],
  },
  {
    id: "cacheHit",
    group: "cost",
    kind: "other",
    name: "Prompt-cache hit rate",
    short: "Cache hit rate",
    definition: "Input tokens served from the prompt cache over all input tokens.",
    lowerIsBetter: false,
    tolerance: 2,
    deltaMode: "absolute",
    deltaUnit: " pts",
    suffix: "%",
    decimals: 0,
    target: { op: ">=", value: 60 },
    series: [15, 15, 18, 22, 27, 33, 41, 50, 47, 57, 63, 67, 70],
  },

  // People
  {
    id: "devex",
    group: "people",
    kind: "other",
    name: "Developer experience survey",
    short: "DevEx survey",
    definition: "Monthly pulse, team average, scored 0 to 100. Anonymous.",
    lowerIsBetter: false,
    tolerance: 2,
    deltaMode: "absolute",
    deltaUnit: " pts",
    suffix: " / 100",
    decimals: 0,
    target: { op: ">=", value: 70 },
    series: [64, 64, 67, 69, 63, 60, 64, 67, 66, 69, 70, 71, 72],
  },
  {
    id: "throughput",
    group: "people",
    kind: "speed",
    name: "Throughput",
    short: "Throughput",
    definition: "Merged changes per team per week.",
    lowerIsBetter: false,
    tolerance: 0.5,
    deltaMode: "relative",
    suffix: " / team / wk",
    decimals: 1,
    target: { op: ">=", value: 18 },
    series: [14, 14, 14.6, 15.1, 14.9, 15.3, 15.9, 16.6, 16.9, 17.5, 18, 18.4, 18.7],
  },
  {
    id: "reviewLoad",
    group: "people",
    kind: "quality",
    name: "Review load",
    short: "Review load",
    definition: "Hours spent reviewing per engineer per week, team average.",
    lowerIsBetter: true,
    tolerance: 0.4,
    deltaMode: "absolute",
    deltaUnit: " h",
    suffix: " h / wk",
    decimals: 1,
    target: { op: "<=", value: 7 },
    series: [6.0, 6.0, 6.2, 6.4, 9.1, 10.2, 6.4, 6.3, 6.2, 6.1, 6.1, 6.0, 6.0],
  },
  {
    id: "pages",
    group: "people",
    kind: "other",
    name: "On-call pages per shift",
    short: "Pages / shift",
    definition: "Pages that woke someone, per on-call shift, team average.",
    lowerIsBetter: true,
    tolerance: 0.2,
    deltaMode: "relative",
    suffix: "",
    decimals: 1,
    target: { op: "<=", value: 2 },
    series: [2.4, 2.4, 2.4, 2.3, 2.8, 3.3, 2.6, 2.3, 2.3, 2.1, 2.0, 1.9, 1.9],
  },
];

/** Series the rules read that are not on the scorecard. */
export const SIGNALS = {
  /** Share of human-written lines rewritten within 21 days, for comparison with agent code. */
  humanRework: [8.0, 8.0, 8.0, 7.9, 8.1, 8.2, 8.1, 8.0, 7.9, 7.9, 7.8, 7.8, 7.7],
  /** Dashboards or reports that slice any metric by individual (from a monthly audit of saved queries). */
  perPersonViews: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
} as const satisfies Record<string, readonly number[]>;

export type SignalId = keyof typeof SIGNALS;

/** No speed metric is reported alone: each one sits next to the quality metric it could hurt. */
export type Pair = { id: string; speed: string; quality: string; why: string };

export const PAIRS: readonly Pair[] = [
  {
    id: "flow",
    speed: "cycleTime",
    quality: "cfr",
    why: "Faster changes are only better if they do not break more often.",
  },
  {
    id: "release",
    speed: "deployFreq",
    quality: "uptime",
    why: "More deploys are only better while the error budget holds.",
  },
  {
    id: "agents",
    speed: "firstPass",
    quality: "rework",
    why: "Agent changes that pass review first time only count if they are not rewritten weeks later.",
  },
  {
    id: "people",
    speed: "throughput",
    quality: "reviewLoad",
    why: "More merged work is only better if reviewers are not buried.",
  },
];

export type Phase = {
  id: string;
  name: string;
  start: number;
  end: number;
  summary: string;
  exitTest: string;
};

export const PHASES: readonly Phase[] = [
  {
    id: "baseline",
    name: "Baseline",
    start: 0,
    end: 1,
    summary: "Measure for four weeks without changing how anyone works.",
    exitTest: "Every scorecard metric has a month of clean data and each team agrees its numbers are right.",
  },
  {
    id: "pilot",
    name: "Pilot",
    start: 2,
    end: 3,
    summary: "Two of six teams work with agents: tests and evals first, small pull requests, other models reviewing.",
    exitTest: "Pilot cycle time improves while change failure rate and rework stay within noise of baseline.",
  },
  {
    id: "expand",
    name: "Expand",
    start: 4,
    end: 6,
    summary: "All six teams onboard, two at a time, with the decision rules live.",
    exitTest: "Every pair Healthy for a full month and no rule active.",
  },
  {
    id: "steady",
    name: "Steady state",
    start: 7,
    end: 12,
    summary: "Routing, caching and evals tuned; the reports become the monthly operating review.",
    exitTest: "Pairs hold for a quarter and AI spend per merged change is under target.",
  },
];

export type Tone = "neutral" | "good" | "bad";

export type TimelineEvent = { month: number; title: string; note: string; tone: Tone };

export const EVENTS: readonly TimelineEvent[] = [
  {
    month: 0,
    title: "Baseline starts",
    note: "Dashboards built from Git, CI, deploy and incident data. No change to how teams work yet.",
    tone: "neutral",
  },
  {
    month: 2,
    title: "Pilot: two teams",
    note: "Agents write tests and evals first, then the change. The largest model does nearly everything, so spend per merged change across the org goes from about $2 (autocomplete only) to $12, nearly all of it on the two pilot teams.",
    tone: "neutral",
  },
  {
    month: 3,
    title: "Pilot result",
    note: "Pilot teams' cycle time down about 20%; rolled up across all six teams, 8%. Change failure rate and rework flat. Exit test passed.",
    tone: "good",
  },
  {
    month: 4,
    title: "Expansion starts",
    note: "Two more teams onboard and the pilot gains partly slip. Agent pull requests grow larger, review latency passes one day, change failure rate jumps to 15%. Spend per change peaks at $38.",
    tone: "bad",
  },
  {
    month: 5,
    title: "Rules fire",
    note: "Change failure rate at 15.8%, review load peaks, and the booking service spends its error budget. Expansion pauses and feature work on bookings stops.",
    tone: "bad",
  },
  {
    month: 6,
    title: "Responses land",
    note: "PR size capped, AI first-pass review before people, reviewers rebalanced, spec and context templates rewritten.",
    tone: "good",
  },
  {
    month: 7,
    title: "Routing by job",
    note: "Small models for lint fixes and test scaffolds, medium for most changes, large only for design and hard bugs. Prompt-cache hit rate passes 50%.",
    tone: "good",
  },
  {
    month: 8,
    title: "Model upgrade",
    note: "A new model version drops the eval pass rate below the release threshold. The release is blocked.",
    tone: "bad",
  },
  {
    month: 9,
    title: "Upgrade fixed",
    note: "Prompts adjusted against the failing evals; pass rate back above threshold and the release ships.",
    tone: "good",
  },
  {
    month: 12,
    title: "One year on",
    note: "Every pair Healthy. Cycle time down 29%, throughput up 34%, deploys up 52%, change failure rate 10.4%. AI spend about $22 per merged change, roughly $270 per engineer per month.",
    tone: "good",
  },
];

/** Share of tokens by model tier each month, in percent. Each month sums to 100. */
export type TierShare = { small: number; medium: number; large: number };

export const TIER_SHARES: readonly TierShare[] = [
  // Baseline: editor autocomplete, which runs on small models.
  { small: 60, medium: 30, large: 10 },
  { small: 60, medium: 30, large: 10 },
  // Pilot and expansion: the largest model for everything.
  { small: 8, medium: 22, large: 70 },
  { small: 6, medium: 20, large: 74 },
  { small: 7, medium: 21, large: 72 },
  { small: 10, medium: 25, large: 65 },
  { small: 15, medium: 32, large: 53 },
  // Routing by job from month 7.
  { small: 24, medium: 40, large: 36 },
  { small: 22, medium: 38, large: 40 },
  { small: 28, medium: 42, large: 30 },
  { small: 31, medium: 44, large: 25 },
  { small: 33, medium: 45, large: 22 },
  { small: 35, medium: 45, large: 20 },
];

/** How a rule's condition is tested against the data. */
export type RuleTest =
  | { kind: "aboveBaseline"; metric: string; margin: number }
  | { kind: "above"; series: string; threshold: number }
  | { kind: "below"; series: string; threshold: number }
  | { kind: "aboveSeries"; series: string; other: string };

export type Rule = {
  id: string;
  when: string;
  then: string;
  /** What Bookwell did when it fired. Shown only once it has fired. */
  response: string;
  test: RuleTest;
};

export const RULES: readonly Rule[] = [
  {
    id: "cfr",
    when: "Change failure rate above baseline two weeks running",
    then: "Expansion pauses",
    response: "The last two teams waited. Reviews were fixed before anyone else onboarded.",
    test: { kind: "aboveBaseline", metric: "cfr", margin: 0.5 },
  },
  {
    id: "budget",
    when: "Error budget spent on a service",
    then: "Feature work stops on that service until it recovers",
    response: "Feature work on the service stopped; the team worked only on reliability.",
    test: { kind: "below", series: "uptime", threshold: 99.9 },
  },
  {
    id: "eval",
    when: "Eval pass rate below the release threshold",
    then: "Release blocked",
    response: "The release candidate with the new model was held. Prompts were fixed against the failing evals.",
    test: { kind: "below", series: "evalPass", threshold: 92 },
  },
  {
    id: "review",
    when: "Review latency over one day for two weeks",
    then: "Review is the bottleneck: cap PR size, add AI first-pass review, rebalance reviewers",
    response: "Change-size v3 replaced the flat 500-line cap: 400 lines for standard changes, 250 for high-risk ones. An AI reviewer took the first pass, and reviewers were shared across teams.",
    test: { kind: "above", series: "reviewLatency", threshold: 24 },
  },
  {
    id: "rework",
    when: "Agent code reworked more than human code",
    then: "Fix specs and context before blaming the tool",
    response: "Spec templates and repository context files were rewritten; agents got the team's conventions up front.",
    test: { kind: "aboveSeries", series: "rework", other: "humanRework" },
  },
  {
    id: "rank",
    when: "A metric is used to rank individuals",
    then: "Stop. The metric comes off that report",
    response: "The report was taken down and the metric reviewed with the team.",
    test: { kind: "above", series: "perPersonViews", threshold: 0 },
  },
];

export const NOT_MEASURED: readonly { name: string; why: string }[] = [
  { name: "Lines of code", why: "Agents make lines cheap; more of them is not more value." },
  { name: "PRs per person", why: "Ranks people, invites splitting work, and breaks the per-team rule." },
  { name: "“Hours saved” estimates", why: "Self-reported guesses. Cycle time and throughput show the real change." },
];

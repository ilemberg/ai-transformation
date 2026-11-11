import type { Actor, ActorId, Lane, Station, TestKindInfo, Tier } from "./types";

export const LANES: { id: Lane; blurb: string }[] = [
  { id: "Plan", blurb: "Decide what to build" },
  { id: "Build", blurb: "Prove it first, then write it" },
  { id: "Prove", blurb: "Gates nobody can talk past" },
  { id: "Run", blurb: "Ship small, watch, learn" },
];

export const STATIONS: Station[] = [
  {
    id: "intake",
    brief: "A small, cheap model triages every ticket from Jira, GitHub or an alert, links duplicates and picks the route, so risky work does not slip into the fast lane.",
    lane: "Plan",
    name: "Intake",
    tagline: "Pull the ticket in",
    whatWeDo:
      "A small, cheap model reads every new ticket from Jira, GitHub or a monitoring alert. It finds duplicates, tags the part of the code involved, scores the risk and picks the route: which stations this ticket needs and which it can skip.",
    catches: "Duplicate work, vague tickets, and risky changes sneaking down the fast lane.",
    gate: "A ticket with no clear outcome goes back to its author with questions.",
    outputs: ["Labels and code area", "Risk score", "Route through the line", "Linked duplicates"],
    actors: ["triage"],
    environment: "Ticket system",
  },
  {
    id: "plan",
    brief: "A large model drafts the spec with acceptance examples and a person argues with it until they sign, because building the wrong thing is the most expensive bug.",
    lane: "Plan",
    name: "Plan",
    tagline: "Write the spec, argue about it",
    whatWeDo:
      "A large model reads the ticket and the code and drafts a spec: the change, acceptance criteria written as examples, what is out of scope, the risks, a test plan and a rollout plan. A person pushes back and the spec is revised until they sign it.",
    catches: "Building the wrong thing, which is the most expensive bug there is.",
    gate: "No code is written until a person signs the spec.",
    outputs: ["spec.md", "Acceptance examples", "Test plan", "Rollout plan"],
    actors: ["planner", "owner"],
    environment: "Cloud sandbox",
  },
  {
    id: "tests",
    brief: "Every acceptance example becomes failing tests at each level that applies, plus evals and load scripts, then locked: changing one later takes a recorded amendment that a person approves.",
    lane: "Build",
    name: "Tests first",
    tagline: "Tests and evals before code",
    whatWeDo:
      "An agent turns every acceptance example into tests at each level that applies: unit, integration, contract, behaviour, end-to-end, browser and accessibility. AI features get an eval set; speed-sensitive changes get a load script. Everything fails, because the code does not exist yet. A person reviews the tests, not the code.",
    catches: "Tests written after the code that only confirm what the code already does.",
    gate: "Every acceptance example has a failing test and a person has reviewed them. Then they are locked. Mutation testing comes later, once the code passes.",
    outputs: ["Failing test suite", "Eval golden set", "Load script with a budget", "Locked test manifest"],
    actors: ["tester", "engineer"],
    environment: "Cloud sandbox",
  },
  {
    id: "build",
    brief: "A coding agent works in a throwaway cloud sandbox until the locked tests pass; a rule rejects any edit to them, a wrong test needs an approved amendment, and it hands over when its budget runs out.",
    lane: "Build",
    name: "Build",
    tagline: "An agent writes the code",
    whatWeDo:
      "A coding agent works in a throwaway cloud sandbox: a container with the repo, a seeded database and no production secrets. It loops (edit, run the tests, read the failures) until everything is green. A rule rejects any edit to the locked tests and the run records the attempt; if a test really is wrong, the agent files an amendment that a person approves separately.",
    catches: "An agent that passes by weakening the tests.",
    gate: "Every locked test is green and the change is under the size cap, or it is split.",
    outputs: ["Pull request labelled agent-written", "Run trace", "Sandbox torn down"],
    actors: ["builder"],
    environment: "Cloud sandbox",
  },
  {
    id: "review",
    brief: "A model from a different family reviews the change against the spec, a security agent checks it, then a person approves with the findings already sorted.",
    lane: "Build",
    name: "Review",
    tagline: "Other models, then a person",
    whatWeDo:
      "A model from a different family reviews the change against the spec, because a model is poor at spotting its own blind spots. A security reviewer checks sign-in, input handling, secrets and dependencies. Then a person reviews, with the findings already sorted by severity.",
    catches: "Logic errors, security holes, and code that passes the tests but does not match the spec.",
    gate: "No unresolved serious finding, and one human approval.",
    outputs: ["Review findings", "Security notes", "Human approval"],
    actors: ["reviewer", "security", "engineer"],
    environment: "Preview",
  },
  {
    id: "gates",
    brief: "The same checks run for every change whoever wrote it, including the eval pass rate; any red check stops the line and sends the ticket back.",
    lane: "Prove",
    name: "Pipeline gates",
    tagline: "The pipeline decides",
    whatWeDo:
      "CI runs the same checks on every change, whoever wrote it: lint, types, unit, integration and contract tests, a mutation score on critical code, a security scan, a dependency audit, the eval pass rate against its threshold, page weight and accessibility. A preview environment is built and the end-to-end and browser tests run against it.",
    catches: "Regressions anywhere in the product, not only in the files that changed.",
    gate: "Any red check stops the line. Evals also have blocking categories (data leaks, prompt injection) where a single failure stops a release whatever the overall score. An override needs a named owner and a written reason.",
    outputs: ["Check record", "Preview link", "Eval report"],
    actors: ["ci"],
    environment: "Preview",
  },
  {
    id: "stress",
    brief: "Where the route calls for it, load at twice the peak and a break-it agent attack the change; every break becomes a new test.",
    lane: "Prove",
    name: "Load & break-it",
    tagline: "Load it, then attack it",
    whatWeDo:
      "Only where the route says so. Load tests run against a production-sized environment at twice the expected peak. Then a break-it agent attacks the change: odd inputs, races, slow dependencies, permissions, and prompt injection for AI features. Every break becomes a new failing test and goes back to Build.",
    catches: "What works for one user and falls over for a thousand, and what a curious user can break.",
    gate: "Latency and error rate inside budget at peak, and no open break.",
    outputs: ["Load report", "Break list", "New tests from every break"],
    actors: ["loadgen", "breaker"],
    environment: "Staging",
  },
  {
    id: "release",
    brief: "Ship behind a flag to 1%, 10%, 50%, 100% with live tests at each step; if errors or latency move, it rolls itself back.",
    lane: "Run",
    name: "Release",
    tagline: "Ship a little at a time",
    whatWeDo:
      "The change ships dark behind a feature flag, then goes to 1%, 10%, 50% and 100% of traffic. Live synthetic tests run the key journeys in production at every step. If errors, latency or the error-budget burn move, the release rolls itself back.",
    catches: "What only real traffic and real data reveal.",
    gate: "Each step holds its service-level objective for its whole soak time.",
    outputs: ["Flag history", "Canary report", "Live test results"],
    actors: ["deployer", "monitor"],
    environment: "Canary",
  },
  {
    id: "observe",
    brief: "Every request and every model call is traced with its cost, dashboards carry deploy markers, and alerts fire on error-budget burn.",
    lane: "Run",
    name: "Observe",
    tagline: "Watch it like it will break",
    whatWeDo:
      "Every request carries one ID through logs, metrics and traces. Every model call is traced with its prompt version, model, tokens, cost and tool calls. Dashboards carry deploy markers, so a change in behaviour lines up with a change in code. Alerts fire on how fast the error budget is burning, not on every blip.",
    catches: "Known failures within minutes, and unknown ones explained without shipping code to investigate.",
    gate: "Error budget left. When it runs out, feature work on that service stops.",
    outputs: ["Service dashboard", "Model-call traces", "Error budget"],
    actors: ["monitor", "oncall"],
    environment: "Production",
  },
  {
    id: "learn",
    brief: "Every incident comes back as a failing test, and the gate that missed it gets a new rule or eval case, so that failure is caught if it comes back.",
    lane: "Run",
    name: "Bug loop",
    tagline: "When a bug comes in",
    whatWeDo:
      "An alert or a customer report becomes a ticket automatically, with the trace, the deploy and the agent run that wrote the code attached. The first step of every fix is a failing test that reproduces it. Afterwards we ask which gate should have caught it, and that gate gets a new test, rule or eval case. The ticket re-enters the line at Intake.",
    catches: "The same failure coming back.",
    gate: "A fix is not done until the gate that missed it has been strengthened.",
    outputs: ["Linked incident", "Reproducing test", "New gate rule or eval case"],
    actors: ["oncall", "triage"],
    environment: "Production",
  },
];

export const ACTORS: Record<ActorId, Actor> = {
  triage: { id: "triage", name: "Triage agent", kind: "agent", tier: "small", role: "Sorts, dedupes and routes tickets" },
  planner: { id: "planner", name: "Planner agent", kind: "agent", tier: "large", role: "Reads the code, drafts the spec" },
  tester: { id: "tester", name: "Test-writer agent", kind: "agent", tier: "medium", role: "Writes tests and evals first" },
  builder: { id: "builder", name: "Coding agent", kind: "agent", tier: "medium", role: "Writes code until the tests pass" },
  reviewer: {
    id: "reviewer",
    name: "Review agent",
    kind: "agent",
    tier: "large",
    role: "A different model family checks the diff",
  },
  security: { id: "security", name: "Security agent", kind: "agent", tier: "medium", role: "Checks auth, input, secrets" },
  breaker: { id: "breaker", name: "Break-it agent", kind: "agent", tier: "large", role: "Attacks the change on purpose" },
  ci: { id: "ci", name: "CI pipeline", kind: "system", role: "Runs every check, every time" },
  loadgen: { id: "loadgen", name: "Load generator", kind: "system", role: "Simulates peak traffic" },
  deployer: { id: "deployer", name: "Release controller", kind: "system", role: "Flags, canaries, rollbacks" },
  monitor: { id: "monitor", name: "Monitoring", kind: "system", role: "SLOs, traces, alerts" },
  owner: { id: "owner", name: "Product owner", kind: "human", role: "Signs the spec" },
  engineer: { id: "engineer", name: "Engineer", kind: "human", role: "Reviews tests and code" },
  oncall: { id: "oncall", name: "On-call engineer", kind: "human", role: "Owns incidents" },
};

export const TEST_KINDS: TestKindInfo[] = [
  { id: "unit", name: "Unit", proves: "Each function does what it says" },
  { id: "integration", name: "Integration", proves: "Parts work together with a real database" },
  { id: "contract", name: "Contract", proves: "APIs keep their promises to callers" },
  { id: "behaviour", name: "Behaviour", proves: "The acceptance examples, in plain words" },
  { id: "e2e", name: "End-to-end", proves: "A whole journey works through the UI" },
  { id: "browser", name: "Browser", proves: "Chrome, Safari, Firefox and a phone" },
  { id: "a11y", name: "Accessibility", proves: "Keyboard, screen reader, contrast" },
  { id: "evals", name: "Evals", proves: "AI answers are right, not just well-formed" },
  { id: "load", name: "Load", proves: "It holds at twice the peak" },
  { id: "breakit", name: "Break-it", proves: "Every attack that worked, now a test" },
];

/**
 * Blended price per million tokens: mostly input, much of it served from the
 * prompt cache, as agent runs are. Roughly in line with late-2026 list prices
 * for small, mid and frontier models.
 */
export const TIERS: { id: Tier; name: string; usedFor: string; usdPerMillion: number }[] = [
  { id: "small", name: "Small model", usedFor: "Sorting, routing, summaries", usdPerMillion: 0.15 },
  { id: "medium", name: "Medium model", usedFor: "Writing tests and code", usdPerMillion: 2.5 },
  { id: "large", name: "Large model", usedFor: "Planning, reviewing, attacking", usdPerMillion: 5 },
];

/** Price of a minute of cloud sandbox or CI runner time. */
export const COMPUTE_USD_PER_MINUTE = 0.02;

export const STATION_IDS = [
  "intake",
  "plan",
  "tests",
  "build",
  "review",
  "gates",
  "stress",
  "release",
  "observe",
  "learn",
] as const;
export type StationId = (typeof STATION_IDS)[number];

export type Lane = "Plan" | "Build" | "Prove" | "Run";

/** Model size, which is the main lever on cost: small for sorting, medium for writing, large for judging. */
export type Tier = "small" | "medium" | "large";

export type ActorKind = "agent" | "human" | "system";

export type ActorId =
  | "triage"
  | "planner"
  | "tester"
  | "builder"
  | "reviewer"
  | "security"
  | "breaker"
  | "ci"
  | "loadgen"
  | "deployer"
  | "monitor"
  | "owner"
  | "engineer"
  | "oncall";

export interface Actor {
  id: ActorId;
  name: string;
  kind: ActorKind;
  /** Agents only: which size of model does this job. */
  tier?: Tier;
  /** One line on what this actor is for. */
  role: string;
}

export const ENVIRONMENTS = ["Ticket system", "Cloud sandbox", "Preview", "Staging", "Canary", "Production"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export interface Station {
  id: StationId;
  lane: Lane;
  name: string;
  /** Short verb phrase shown under the node. */
  tagline: string;
  /** One sentence: what happens here and what it catches. Shown under the board. */
  brief: string;
  whatWeDo: string;
  catches: string;
  /** What stops the line here. */
  gate: string;
  outputs: string[];
  actors: ActorId[];
  environment: Environment;
}

export type TestKind =
  | "unit"
  | "integration"
  | "contract"
  | "behaviour"
  | "e2e"
  | "browser"
  | "a11y"
  | "evals"
  | "load"
  | "breakit";

export interface TestKindInfo {
  id: TestKind;
  name: string;
  /** What this kind of test proves, in a few words. */
  proves: string;
}

export interface TicketTests {
  count: number;
  /** Shown as a short unit, e.g. "cases", "scenarios". */
  unit: string;
  /** The station where these tests are written (they show red from here). */
  writtenAt: StationId;
  /** The station whose completion turns them green. */
  greenAt: StationId;
}

export type Tone = "pass" | "fail" | "warn" | "info";

export interface LogLine {
  who: ActorId;
  text: string;
  tone?: Tone;
  /** A request trace on the Observe page that shows this moment. */
  trace?: string;
}

export type StepMode = "full" | "light" | "skip";

export interface Usage {
  /** Thousands of tokens by model size. */
  ktokens: Partial<Record<Tier, number>>;
  /** Minutes of cloud sandbox or runner time. */
  computeMinutes: number;
  /** Elapsed minutes for this station, start to finish. */
  wallMinutes: number;
  /** Minutes a person spent at this station. */
  humanMinutes: number;
}

export interface TicketStep {
  station: StationId;
  mode: StepMode;
  /** Test kinds this step turns red or green when it finishes (a failed eval run, a rollback). */
  sets?: Partial<Record<TestKind, "red" | "green">>;
  /** For a skipped or light station: why. */
  reason?: string;
  log: LogLine[];
  usage: Usage;
}

export type TicketKind = "feature" | "bug" | "performance" | "task";

export interface Ticket {
  id: string;
  key: string;
  kind: TicketKind;
  title: string;
  source: string;
  priority: string;
  summary: string;
  /** Steps taken per beat when the whole board plays. A P1 on the fast lane moves quicker. */
  pace?: number;
  tests: Partial<Record<TestKind, TicketTests>>;
  steps: TicketStep[];
}

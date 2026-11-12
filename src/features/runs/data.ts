/**
 * Bookwell's run records, fault cases, queue and team adoption, as shown on
 * the Runs page. Ticket keys and actors match the board in src/features/line.
 */
import type { ActorId } from "@/features/line/types";
import { TIERS } from "@/features/line/stations";
import { costUsd, scheduleAttempts, type QueuedRun } from "./logic";

/** Every actor on the board, plus the orchestrator itself. */
export type RunActor = ActorId | "orchestrator";

export type StepStatus = "ok" | "warn" | "proposed" | "rejected" | "waiting" | "approved";

export type RunStep = {
  at: string;
  step: string;
  actor: RunActor;
  input: string;
  output: string;
  tokens: number;
  artifacts: string[];
  status: StepStatus;
  /** Steps that belong to the locked-test story or the amendment, highlighted in the table. */
  mark?: "locked" | "amend";
};

export const MEDIUM_USD_PER_M = TIERS.find((t) => t.id === "medium")!.usdPerMillion;

export const RUN = {
  id: "run_7f3a",
  ticket: "BW-142",
  station: "Build",
  workspace: "ws-7f3a",
  worker: "w-5",
  idempotencyKey: "bw142-build-1",
  started: "10:14:02",
  finished: "10:55:12",
  model: "Medium model",
  budgetUsd: 25,
  sizeCap: 250,
};

export const RUN_STEPS: RunStep[] = [
  {
    at: "10:14:02",
    step: "Run accepted",
    actor: "orchestrator",
    input: "build.start for BW-142, key bw142-build-1",
    output: "run_7f3a queued; budget $25.00 held",
    tokens: 0,
    artifacts: [],
    status: "ok",
  },
  {
    at: "10:14:07",
    step: "Workspace created",
    actor: "orchestrator",
    input: "repo @ a41e9c2, seeded database",
    output: "ws-7f3a ready; no production secrets; locked test manifest loaded (63 tests, hash a91c…)",
    tokens: 0,
    artifacts: ["workspace.json"],
    status: "ok",
  },
  {
    at: "10:14:11",
    step: "Read spec and tests",
    actor: "builder",
    input: "spec.md, 63 failing tests",
    output: "Change plan: 6 files in src/rebooking",
    tokens: 420_000,
    artifacts: ["plan.md"],
    status: "ok",
  },
  {
    at: "10:20:36",
    step: "Loop 1: edit",
    actor: "builder",
    input: "plan.md",
    output: "6 files changed, 388 lines",
    tokens: 1_380_000,
    artifacts: ["diff.patch"],
    status: "ok",
  },
  {
    at: "10:22:10",
    step: "Loop 1: tests",
    actor: "ci",
    input: "diff.patch",
    output: "61 of 63 pass. Failing: loyalty tie-break, EUR fare rounding",
    tokens: 0,
    artifacts: ["test-report.json"],
    status: "warn",
  },
  {
    at: "10:22:14",
    step: "Checkpoint",
    actor: "orchestrator",
    input: "workspace + conversation",
    output: "ckpt-1 saved",
    tokens: 0,
    artifacts: ["ckpt-1"],
    status: "ok",
  },
  {
    at: "10:23:31",
    step: "Edit proposed to a test",
    actor: "builder",
    input: "tests/rebooking/rounding.test.ts",
    output: "Change expected fare difference from €104.99 to €105.00",
    tokens: 160_000,
    artifacts: [],
    status: "proposed",
    mark: "locked",
  },
  {
    at: "10:23:31",
    step: "Rule locked-tests",
    actor: "orchestrator",
    input: "write to tests/rebooking/rounding.test.ts",
    output: "Rejected: file is in the locked test manifest, hash a91c…",
    tokens: 0,
    artifacts: ["policy-decision.json"],
    status: "rejected",
    mark: "locked",
  },
  {
    at: "10:23:32",
    step: "Refusal recorded",
    actor: "orchestrator",
    input: "policy decision",
    output: "Returned to the agent as a tool error; no file written; counted on the run",
    tokens: 0,
    artifacts: [],
    status: "ok",
    mark: "locked",
  },
  {
    at: "10:29:05",
    step: "Loop 2: fix the code",
    actor: "builder",
    input: "rejection + failing test",
    output: "src/rebooking/price-diff.ts rounds after converting currency, not before",
    tokens: 1_020_000,
    artifacts: ["diff.patch"],
    status: "ok",
    mark: "locked",
  },
  {
    at: "10:30:21",
    step: "Loop 2: tests",
    actor: "ci",
    input: "diff.patch",
    output: "62 of 63 pass. rounding.test.ts passes. Failing: loyalty tie-break",
    tokens: 0,
    artifacts: ["test-report.json"],
    status: "warn",
    mark: "locked",
  },
  {
    at: "10:30:25",
    step: "Checkpoint",
    actor: "orchestrator",
    input: "workspace + conversation",
    output: "ckpt-2 saved",
    tokens: 0,
    artifacts: ["ckpt-2"],
    status: "ok",
  },
  {
    at: "10:37:48",
    step: "Loop 3: edit",
    actor: "builder",
    input: "failing tie-break, spec example 4",
    output: "Tie-break fixed; amounts use each currency's minor units",
    tokens: 1_240_000,
    artifacts: ["diff.patch"],
    status: "ok",
  },
  {
    at: "10:39:02",
    step: "Loop 3: tests",
    actor: "ci",
    input: "diff.patch",
    output: "62 of 63 pass. Failing: fees.test.ts › JPY change fee expects ¥1,250.50",
    tokens: 0,
    artifacts: ["test-report.json"],
    status: "warn",
  },
  {
    at: "10:39:06",
    step: "Checkpoint",
    actor: "orchestrator",
    input: "workspace + conversation",
    output: "ckpt-3 saved",
    tokens: 0,
    artifacts: ["ckpt-3"],
    status: "ok",
  },
  {
    at: "10:40:15",
    step: "amend-request #12 filed",
    actor: "builder",
    input: "tests/rebooking/fees.test.ts",
    output: "Test expects ¥1,250.50; yen has no minor unit and spec example 4 says whole yen. Proposed: ¥1,251",
    tokens: 120_000,
    artifacts: ["amend-request-12.md"],
    status: "waiting",
    mark: "amend",
  },
  {
    at: "10:40:16",
    step: "Run paused",
    actor: "orchestrator",
    input: "amend-request #12",
    output: "Waiting on approval; routed to the test owner; self-approval is refused by rule",
    tokens: 0,
    artifacts: [],
    status: "waiting",
    mark: "amend",
  },
  {
    at: "10:43:22",
    step: "Amendment approved",
    actor: "engineer",
    input: "amend-request #12",
    output: "“Spec example 4 is right; the test used two decimals for every currency.”",
    tokens: 0,
    artifacts: [],
    status: "approved",
    mark: "amend",
  },
  {
    at: "10:43:23",
    step: "Manifest updated",
    actor: "orchestrator",
    input: "approved test diff",
    output: "Recorded with approver and reason. Manifest hash a91c… → 3e07…. Run resumed from ckpt-3",
    tokens: 0,
    artifacts: ["manifest-3e07.json"],
    status: "ok",
    mark: "amend",
  },
  {
    at: "10:49:40",
    step: "Loop 4: tidy",
    actor: "builder",
    input: "amended manifest",
    output: "Diff trimmed from 455 to 412 lines",
    tokens: 980_000,
    artifacts: ["diff.patch"],
    status: "ok",
  },
  {
    at: "10:51:02",
    step: "Loop 4: tests",
    actor: "ci",
    input: "diff.patch, manifest 3e07…",
    output: "63 of 63 pass. 412 lines: over the 250-line cap for high-risk changes (change-size v3); split into 238 + 174",
    tokens: 0,
    artifacts: ["test-report.json"],
    status: "ok",
  },
  {
    at: "10:54:48",
    step: "Pull request opened",
    actor: "builder",
    input: "final diff",
    output: "PR #2281 labelled agent-written, with the run trace attached",
    tokens: 480_000,
    artifacts: ["diff.patch", "trace.json"],
    status: "ok",
  },
  {
    at: "10:55:12",
    step: "Run closed",
    actor: "orchestrator",
    input: "PR #2281",
    output: "ws-7f3a torn down; unspent budget released",
    tokens: 0,
    artifacts: ["run-summary.json"],
    status: "ok",
  },
];

export const stepCost = (s: RunStep) => costUsd(s.tokens, MEDIUM_USD_PER_M);

export const AMENDMENT = {
  id: "amend-request #12",
  file: "tests/rebooking/fees.test.ts",
  test: "JPY change fee",
  requestedBy: "builder" as const,
  approvedBy: "engineer" as const,
  claim: "The test expects ¥1,250.50. Yen has no minor unit, and spec example 4 says amounts in yen are whole yen.",
  change: "expect(fee).toEqual(yen(1250.5)) → expect(fee).toEqual(yen(1251))",
  reason: "Spec example 4 is right; the test used two decimals for every currency.",
  hashBefore: "a91c…",
  hashAfter: "3e07…",
  waitedMinutes: 3,
};

// ---------------------------------------------------------------------------
// Fault cases.

export type FaultTone = "neutral" | "bad" | "good" | "info";

export type FaultEvent = { at: string; actor: RunActor; text: string; tone: FaultTone };

export type FaultCase = {
  id: string;
  title: string;
  run: string;
  ticket: string;
  summary: string;
  events: FaultEvent[];
  outcome: string;
};

const RETRIES = scheduleAttempts([75, 90, 14]);

const clock = (base: string, offsetS: number) => {
  const [h, m, s] = base.split(":").map(Number) as [number, number, number];
  const total = h * 3600 + m * 60 + s + Math.round(offsetS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600) % 24)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
};

export const RETRY_ATTEMPTS = RETRIES.map((a) => ({
  ...a,
  at: clock("11:40:00", a.startS),
  inputTokens: 38_000,
  outputTokens: a.outcome === "ok" ? 6_200 : 0,
}));

export const FAULT_CASES: FaultCase[] = [
  {
    id: "crash",
    title: "Worker crash mid-build",
    run: "run_2c91",
    ticket: "BW-87",
    summary: "The machine running the build disappears after loop 3.",
    events: [
      { at: "09:02:10", actor: "orchestrator", text: "Worker w-3 takes run_2c91 on a 30-second lease; workspace ws-2c91.", tone: "neutral" },
      { at: "09:09:44", actor: "builder", text: "Loop 1 done; ckpt-1 written.", tone: "neutral" },
      { at: "09:15:20", actor: "builder", text: "Loop 2 done; ckpt-2 written.", tone: "neutral" },
      { at: "09:21:02", actor: "builder", text: "Loop 3 done; ckpt-3 written: workspace snapshot and conversation state.", tone: "neutral" },
      { at: "09:21:30", actor: "orchestrator", text: "w-3 stops sending heartbeats; its node was evicted.", tone: "bad" },
      { at: "09:22:00", actor: "orchestrator", text: "Heartbeat missed for 30 s. Lease on run_2c91 expires.", tone: "bad" },
      { at: "09:22:01", actor: "orchestrator", text: "Run re-queued with resume point ckpt-3.", tone: "info" },
      { at: "09:22:09", actor: "orchestrator", text: "Worker w-7 takes the run and restores ws-2c91 and the conversation from ckpt-3.", tone: "info" },
      { at: "09:22:15", actor: "builder", text: "Loop 4 starts. Loops 1–3 are not redone.", tone: "good" },
      { at: "09:28:40", actor: "ci", text: "All tests green. Audit history: w-3 ran loops 1–3, w-7 ran loop 4.", tone: "good" },
    ],
    outcome:
      "Lease expired, run re-queued, new worker resumed from ckpt-3. Work lost: the 28 seconds between ckpt-3 and the crash. Tokens spent again on loops 1–3: none.",
  },
  {
    id: "duplicate",
    title: "Duplicate request",
    run: "run_7f3a",
    ticket: "BW-142",
    summary: "The ticket system sends the same “start build” event twice.",
    events: [
      { at: "10:14:01.120", actor: "orchestrator", text: "build.start for BW-142 arrives, idempotency key bw142-build-1.", tone: "neutral" },
      { at: "10:14:01.140", actor: "orchestrator", text: "New key: run_7f3a created and queued. Key stored for 24 hours.", tone: "info" },
      { at: "10:14:01.900", actor: "orchestrator", text: "Our 200 reaches the sender after its 750 ms timeout; the sender schedules a retry.", tone: "bad" },
      { at: "10:14:06.300", actor: "orchestrator", text: "Same event again (webhook retry 1), key bw142-build-1.", tone: "bad" },
      { at: "10:14:06.301", actor: "orchestrator", text: "Key matches run_7f3a. Acknowledged with the existing run id and dropped.", tone: "good" },
    ],
    outcome: "One run, one workspace, one bill. The retry is logged as a duplicate of run_7f3a, not as a second build.",
  },
  {
    id: "timeout",
    title: "Model provider timeout",
    run: "run_5d20",
    ticket: "BW-311",
    summary: "The primary model provider stops answering during a build loop.",
    events: [
      ...RETRY_ATTEMPTS.flatMap<FaultEvent>((a) => {
        const start: FaultEvent = {
          at: a.at,
          actor: "builder",
          text:
            a.attempt === 1
              ? `Attempt 1 to the primary provider (${a.inputTokens / 1000}k input tokens).`
              : `Attempt ${a.attempt} to the ${a.provider} provider after a ${a.waitBeforeS} s backoff.`,
          tone: a.provider === "fallback" ? "info" : "neutral",
        };
        const end: FaultEvent =
          a.outcome === "timeout"
            ? { at: clock("11:40:00", a.endS), actor: "orchestrator", text: `Attempt ${a.attempt}: no answer in ${a.latencyS} s. Call abandoned.`, tone: "bad" }
            : {
                at: clock("11:40:00", a.endS),
                actor: "orchestrator",
                text: `Attempt ${a.attempt} answers in ${a.latencyS} s. Step complete.`,
                tone: "good",
              };
        return [start, end];
      }),
      { at: clock("11:40:00", RETRIES.at(-1)!.endS + 1), actor: "orchestrator", text: "Cost and latency recorded for each attempt; the step's model is noted as the fallback.", tone: "good" },
    ],
    outcome: "Two retries with 2 s and 8 s backoff, then the fallback provider. The step finished; every attempt is in the record with its own cost.",
  },
  {
    id: "cancel",
    title: "Cancellation",
    run: "run_9b41",
    ticket: "BW-158",
    summary: "A person stops a run that is no longer worth paying for.",
    events: [
      { at: "15:03:00", actor: "builder", text: "Loop 2 in progress; a model call is streaming.", tone: "neutral" },
      { at: "15:03:12", actor: "engineer", text: "Cancels run_9b41: “The eval set is being revised; stop spending on this.”", tone: "bad" },
      { at: "15:03:12", actor: "orchestrator", text: "State: cancelling. In-flight call abandoned; 9,200 tokens already streamed are recorded.", tone: "info" },
      { at: "15:03:14", actor: "orchestrator", text: "Partial artifacts kept: diff.patch and test-report.json from loop 1, trace.json.", tone: "info" },
      { at: "15:03:20", actor: "orchestrator", text: "Workspace ws-9b41 torn down.", tone: "info" },
      { at: "15:03:20", actor: "orchestrator", text: "Budget released: $21.40 of the $30.00 hold returns to the team's month.", tone: "good" },
    ],
    outcome: "Stopped within 8 seconds. Nothing half-merged, the work so far is kept for a restart from ckpt-1, and the unspent budget is back.",
  },
];

// ---------------------------------------------------------------------------
// Many runs at once: the queue at 14:20.

export const QUEUE_CLOCK = "14:20";
export const QUEUE_TICK_MINUTES = 10;

export const QUEUE: QueuedRun[] = [
  { id: "run_7f3a", ticket: "BW-142", team: "Rebooking", title: "Suggest three alternatives when a hotel cancels", workspace: "ws-7f3a", files: ["src/rebooking/suggest.ts"], tpm: 0, work: 0, review: 0, state: "done", enqueued: 1 },
  { id: "run_a210", ticket: "BW-164", team: "Booking", title: "Show cancellation deadline in the price summary", workspace: "ws-a210", files: ["src/booking/price.ts"], tpm: 0, work: 0, review: 1, state: "review", enqueued: 2 },
  { id: "run_f770", ticket: "BW-149", team: "Rebooking", title: "Explain why each alternative was chosen", workspace: "ws-f770", files: ["src/rebooking/explain.ts"], tpm: 0, work: 0, review: 3, state: "review", enqueued: 3 },
  { id: "run_c501", ticket: "BW-91", team: "Search", title: "Cache hotel search facets per city", workspace: "ws-c501", files: ["src/search/facets.ts"], tpm: 140_000, work: 1, review: 2, state: "running", enqueued: 4 },
  { id: "run_b388", ticket: "BW-171", team: "Payments", title: "Add a service fee line to the price breakdown", workspace: "ws-b388", files: ["src/booking/price.ts", "src/payments/fees.ts"], tpm: 120_000, work: 2, review: 2, state: "held", heldBy: "run_a210", enqueued: 5 },
  { id: "run_e090", ticket: "BW-60", team: "Platform", title: "Split the deploy pipeline per service", workspace: "ws-e090", files: ["ci/deploy.yml"], tpm: 0, work: 3, review: 2, state: "blocked", reason: "Budget used up; waiting for a person to raise it or stop the run", enqueued: 6 },
  { id: "run_c517", ticket: "BW-93", team: "Search", title: "Rank sold-out hotels last", workspace: "ws-c517", files: ["src/search/rank.ts"], tpm: 110_000, work: 3, review: 1, state: "running", enqueued: 7 },
  { id: "run_d042", ticket: "BW-203", team: "Mobile", title: "Offline view of the booking confirmation", workspace: "ws-d042", files: ["app/booking/Confirmation.tsx"], tpm: 160_000, work: 2, review: 2, state: "running", enqueued: 8 },
  { id: "run_e113", ticket: "BW-55", team: "Platform", title: "Move CI images to the new runtime", workspace: "ws-e113", files: ["ci/images.yml"], tpm: 150_000, work: 4, review: 1, state: "running", enqueued: 9 },
  { id: "run_d077", ticket: "BW-207", team: "Mobile", title: "Push alert when a rebooking needs a decision", workspace: "ws-d077", files: ["app/notify/rebooking.ts"], tpm: 90_000, work: 2, review: 1, state: "rate-limited", enqueued: 10 },
  { id: "run_b402", ticket: "BW-175", team: "Payments", title: "Retry declined cards once with 3-D Secure", workspace: "ws-b402", files: ["src/payments/retry.ts"], tpm: 60_000, work: 2, review: 2, state: "queued", enqueued: 11 },
];

export const QUEUE_TICKS = 5;

// ---------------------------------------------------------------------------
// Adoption across teams, as of month 12.

export type TeamAdoption = {
  team: string;
  owner: string;
  joinedMonth: number;
  onboardingWeeks: number;
  exceptions: string[];
  reviewerCapacityPct: number;
  supportNow: number;
  supportPeak: number;
  cfr: number;
  cfrBaseline: number;
};

export const TEAMS: TeamAdoption[] = [
  {
    team: "Search",
    owner: "Search lead",
    joinedMonth: 2,
    onboardingWeeks: 3,
    exceptions: [],
    reviewerCapacityPct: 66,
    supportNow: 2,
    supportPeak: 11,
    cfr: 9.8,
    cfrBaseline: 11.5,
  },
  {
    team: "Rebooking",
    owner: "Rebooking lead",
    joinedMonth: 2,
    onboardingWeeks: 4,
    exceptions: ["Every prompt change runs the full eval set, not a subset"],
    reviewerCapacityPct: 71,
    supportNow: 3,
    supportPeak: 14,
    cfr: 9.6,
    cfrBaseline: 12.4,
  },
  {
    team: "Booking",
    owner: "Booking lead",
    joinedMonth: 4,
    onboardingWeeks: 6,
    exceptions: ["Load test on every change under src/booking"],
    reviewerCapacityPct: 84,
    supportNow: 4,
    supportPeak: 19,
    cfr: 12.1,
    cfrBaseline: 13.9,
  },
  {
    team: "Mobile",
    owner: "Mobile lead",
    joinedMonth: 4,
    onboardingWeeks: 5,
    exceptions: ["Ships on the weekly app-store train, not by canary"],
    reviewerCapacityPct: 69,
    supportNow: 3,
    supportPeak: 12,
    cfr: 12.8,
    cfrBaseline: 15.2,
  },
  {
    team: "Payments",
    owner: "Payments lead",
    joinedMonth: 6,
    onboardingWeeks: 5,
    exceptions: ["No auto-merge on money paths", "Card-data code runs in a separate workspace pool with no outbound network"],
    reviewerCapacityPct: 77,
    supportNow: 2,
    supportPeak: 9,
    cfr: 7.9,
    cfrBaseline: 8.2,
  },
  {
    team: "Platform",
    owner: "Platform lead",
    joinedMonth: 6,
    onboardingWeeks: 4,
    exceptions: ["Infrastructure plans reviewed by a person before apply"],
    reviewerCapacityPct: 62,
    supportNow: 1,
    supportPeak: 7,
    cfr: 10.2,
    cfrBaseline: 10.8,
  },
];

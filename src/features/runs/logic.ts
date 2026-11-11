/**
 * The orchestration rules behind the Runs page, as pure functions: replay
 * stepping, retry and fallback timing, idempotent request handling, resuming
 * from a checkpoint, and admitting queued runs under concurrency, file-lock and
 * rate limits.
 */

// ---------------------------------------------------------------------------
// Replay: events appear one at a time, by Play or Step.

export type ReplayState = { shown: number; playing: boolean };
export type ReplayAction = "play" | "pause" | "step" | "tick" | "reset";

export const REPLAY_START: ReplayState = { shown: 0, playing: false };

/** Advance a replay of `total` events. Play from the end starts over. */
export function replayReducer(state: ReplayState, action: ReplayAction, total: number): ReplayState {
  switch (action) {
    case "reset":
      return REPLAY_START;
    case "pause":
      return { ...state, playing: false };
    case "play":
      if (state.shown >= total) return { shown: Math.min(1, total), playing: total > 1 };
      return { shown: state.shown === 0 ? Math.min(1, total) : state.shown, playing: true };
    case "step":
      return { shown: Math.min(state.shown + 1, total), playing: false };
    case "tick": {
      if (!state.playing) return state;
      const shown = Math.min(state.shown + 1, total);
      return { shown, playing: shown < total };
    }
  }
}

// ---------------------------------------------------------------------------
// Retries: a timed-out model call is retried with backoff, then sent elsewhere.

/** Seconds to wait before each retry: base, base × factor, base × factor², … */
export function backoffDelays(retries: number, baseS = 2, factor = 4): number[] {
  return Array.from({ length: Math.max(0, retries) }, (_, i) => baseS * factor ** i);
}

export type AttemptResult = { provider: "primary" | "fallback"; outcome: "timeout" | "ok"; latencyS: number };
export type ScheduledAttempt = AttemptResult & { attempt: number; startS: number; endS: number; waitBeforeS: number };

export type RetryPolicy = { timeoutS: number; retries: number; baseS: number; factor: number; fallbackOnAttempt: number };

export const RETRY_POLICY: RetryPolicy = { timeoutS: 60, retries: 2, baseS: 2, factor: 4, fallbackOnAttempt: 3 };

/**
 * Lay out attempts on a clock. `latencies` are how long each attempt would
 * take; anything over the timeout is cut at the timeout. Stops at the first
 * success or when the retries run out.
 */
export function scheduleAttempts(latencies: readonly number[], policy: RetryPolicy = RETRY_POLICY): ScheduledAttempt[] {
  const delays = backoffDelays(policy.retries, policy.baseS, policy.factor);
  const out: ScheduledAttempt[] = [];
  let clock = 0;
  for (let i = 0; i < Math.min(latencies.length, policy.retries + 1); i++) {
    const waitBeforeS = i === 0 ? 0 : delays[i - 1]!;
    const startS = clock + waitBeforeS;
    const raw = latencies[i]!;
    const timedOut = raw > policy.timeoutS;
    const latencyS = timedOut ? policy.timeoutS : raw;
    const attempt = i + 1;
    out.push({
      attempt,
      provider: attempt >= policy.fallbackOnAttempt ? "fallback" : "primary",
      outcome: timedOut ? "timeout" : "ok",
      latencyS,
      startS,
      endS: startS + latencyS,
      waitBeforeS,
    });
    clock = startS + latencyS;
    if (!timedOut) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Idempotency: the same request twice makes one run.

export type IncomingRequest = { id: string; key: string; at: string };
export type DedupeResult = { accepted: IncomingRequest[]; dropped: { request: IncomingRequest; duplicateOf: string }[] };

/** Accept the first request per idempotency key; acknowledge and drop the rest. */
export function dedupeRequests(requests: readonly IncomingRequest[], seen: ReadonlyMap<string, string> = new Map()): DedupeResult {
  const known = new Map(seen);
  const accepted: IncomingRequest[] = [];
  const dropped: DedupeResult["dropped"] = [];
  for (const r of requests) {
    const first = known.get(r.key);
    if (first) {
      dropped.push({ request: r, duplicateOf: first });
    } else {
      known.set(r.key, r.id);
      accepted.push(r);
    }
  }
  return { accepted, dropped };
}

// ---------------------------------------------------------------------------
// Checkpoints: a new worker resumes after the last one written.

export type ResumePlan = { checkpoint: string | null; kept: number[]; redo: number[] };

/**
 * `checkpointed` lists loops whose checkpoint was written; `crashedInLoop` is
 * the loop that was running when the worker died.
 */
export function resumePlan(checkpointed: readonly number[], crashedInLoop: number): ResumePlan {
  const safe = checkpointed.filter((l) => l < crashedInLoop);
  const last = safe.length ? Math.max(...safe) : 0;
  const kept = Array.from({ length: last }, (_, i) => i + 1);
  const redo = Array.from({ length: crashedInLoop - last }, (_, i) => last + i + 1);
  return { checkpoint: last ? `ckpt-${last}` : null, kept, redo };
}

// ---------------------------------------------------------------------------
// Many runs at once: admission under limits and file locks.

export type RunState = "queued" | "running" | "review" | "held" | "rate-limited" | "blocked" | "done";

export type QueuedRun = {
  id: string;
  ticket: string;
  team: string;
  title: string;
  workspace: string;
  files: string[];
  /** Tokens per minute while running. */
  tpm: number;
  /** Ticks of work left while running. */
  work: number;
  /** Ticks of review left before merge. */
  review: number;
  state: RunState;
  /** Order it joined the queue; lower goes first. */
  enqueued: number;
  heldBy?: string;
  rebased?: boolean;
  /** Why a blocked run is blocked. */
  reason?: string;
};

export type Limits = { perTeam: number; total: number; tokensPerMin: number };

export const LIMITS: Limits = { perTeam: 12, total: 40, tokensPerMin: 600_000 };

export const tokensInUse = (runs: readonly QueuedRun[]) =>
  runs.filter((r) => r.state === "running").reduce((s, r) => s + r.tpm, 0);

export const runningCount = (runs: readonly QueuedRun[], team?: string) =>
  runs.filter((r) => r.state === "running" && (team === undefined || r.team === team)).length;

/** Which active run (running or in review) holds each file. First come, first served. */
export function fileLocks(runs: readonly QueuedRun[]): Map<string, string> {
  const locks = new Map<string, string>();
  const active = runs.filter((r) => r.state === "running" || r.state === "review").sort((a, b) => a.enqueued - b.enqueued);
  for (const r of active) for (const f of r.files) if (!locks.has(f)) locks.set(f, r.id);
  return locks;
}

/** Start queued runs in queue order where the limits, locks and token budget allow. */
export function admit(runs: readonly QueuedRun[], limits: Limits = LIMITS): QueuedRun[] {
  const next = runs.map((r) => ({ ...r }));
  const locks = fileLocks(next);
  const waiting = next.filter((r) => r.state === "queued" || r.state === "rate-limited").sort((a, b) => a.enqueued - b.enqueued);
  // Once one run is waiting on tokens, later runs queue behind it rather than overtake.
  let tokenLine = false;
  for (const r of waiting) {
    const lockedBy = r.files.map((f) => locks.get(f)).find((id) => id !== undefined && id !== r.id);
    if (lockedBy) {
      r.state = "held";
      r.heldBy = lockedBy;
      continue;
    }
    if (runningCount(next) >= limits.total || runningCount(next, r.team) >= limits.perTeam) {
      r.state = "queued";
      continue;
    }
    if (tokenLine) {
      r.state = "queued";
      continue;
    }
    if (tokensInUse(next) + r.tpm > limits.tokensPerMin) {
      r.state = "rate-limited";
      tokenLine = true;
      continue;
    }
    r.state = "running";
    for (const f of r.files) locks.set(f, r.id);
  }
  return next;
}

/**
 * One tick of the scheduler: running work counts down into review, review
 * counts down into a merge, a merge releases its files and rebases the runs
 * held behind it, then queued runs are admitted.
 */
export function stepQueue(runs: readonly QueuedRun[], limits: Limits = LIMITS): QueuedRun[] {
  const next = runs.map((r) => ({ ...r }));
  for (const r of next) {
    if (r.state === "running") {
      r.work = Math.max(0, r.work - 1);
      if (r.work === 0) r.state = "review";
    } else if (r.state === "review") {
      r.review = Math.max(0, r.review - 1);
      if (r.review === 0) r.state = "done";
    }
  }
  const merged = new Set(next.filter((r) => r.state === "done").map((r) => r.id));
  for (const r of next) {
    if (r.state === "held" && r.heldBy && merged.has(r.heldBy)) {
      r.state = "queued";
      r.rebased = true;
      r.heldBy = undefined;
    }
  }
  return admit(next, limits);
}

/** Plain-words lines for what changed between two ticks. */
export function describeTick(prev: readonly QueuedRun[], next: readonly QueuedRun[]): string[] {
  const before = new Map(prev.map((r) => [r.id, r]));
  const lines: string[] = [];
  for (const r of next) {
    const p = before.get(r.id);
    if (!p || p.state === r.state) continue;
    if (r.state === "review") lines.push(`${r.id} finished building; waiting for review`);
    else if (r.state === "done") lines.push(`${r.id} merged; workspace ${r.workspace} torn down`);
    else if (r.state === "running" && r.rebased) lines.push(`${r.id} rebased onto main and started`);
    else if (r.state === "running") lines.push(`${r.id} started in ${r.workspace}`);
    else if (r.state === "held") lines.push(`${r.id} held: ${r.heldBy} is editing the same file`);
    else if (r.state === "rate-limited") lines.push(`${r.id} waiting: provider token limit reached`);
    else if (r.state === "queued" && r.rebased) lines.push(`${r.id} released: ${p.heldBy} merged`);
  }
  return lines;
}

/** The queue at every tick from the start, for the replay. */
export function simulate(start: readonly QueuedRun[], ticks: number, limits: Limits = LIMITS): QueuedRun[][] {
  const frames: QueuedRun[][] = [start.map((r) => ({ ...r }))];
  for (let i = 0; i < ticks; i++) frames.push(stepQueue(frames[i]!, limits));
  return frames;
}

// ---------------------------------------------------------------------------
// Money.

/** US dollars for a number of tokens at a price per million. */
export const costUsd = (tokens: number, usdPerMillion: number) => Math.round((tokens / 1_000_000) * usdPerMillion * 100) / 100;

export const formatUsd = (usd: number) => `$${usd.toFixed(2)}`;

export const formatTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);

/** "+1:02" style offset from a start, in seconds. */
export function formatOffset(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `+${m}:${String(sec).padStart(2, "0")}`;
}

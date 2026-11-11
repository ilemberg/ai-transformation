import { describe, expect, it } from "vitest";
import { FAULT_CASES, QUEUE, QUEUE_TICKS, RUN_STEPS, RETRY_ATTEMPTS, TEAMS, stepCost } from "./data";
import {
  REPLAY_START,
  admit,
  backoffDelays,
  costUsd,
  dedupeRequests,
  describeTick,
  fileLocks,
  formatOffset,
  replayReducer,
  resumePlan,
  scheduleAttempts,
  simulate,
  stepQueue,
  tokensInUse,
  type QueuedRun,
} from "./logic";

const run = (over: Partial<QueuedRun> & Pick<QueuedRun, "id">): QueuedRun => ({
  ticket: "BW-1",
  team: "Search",
  title: "",
  workspace: `ws-${over.id}`,
  files: [],
  tpm: 10_000,
  work: 1,
  review: 1,
  state: "queued",
  enqueued: 0,
  ...over,
});

describe("replayReducer", () => {
  it("steps one event at a time and stops at the end", () => {
    let s = REPLAY_START;
    s = replayReducer(s, "step", 2);
    expect(s).toEqual({ shown: 1, playing: false });
    s = replayReducer(s, "step", 2);
    s = replayReducer(s, "step", 2);
    expect(s.shown).toBe(2);
  });

  it("plays to the end, then stops playing", () => {
    let s = replayReducer(REPLAY_START, "play", 3);
    expect(s).toEqual({ shown: 1, playing: true });
    s = replayReducer(s, "tick", 3);
    s = replayReducer(s, "tick", 3);
    expect(s).toEqual({ shown: 3, playing: false });
    expect(replayReducer(s, "tick", 3)).toBe(s);
  });

  it("starts over when played from the end", () => {
    expect(replayReducer({ shown: 3, playing: false }, "play", 3)).toEqual({ shown: 1, playing: true });
  });

  it("ignores ticks while paused", () => {
    const paused = replayReducer(replayReducer(REPLAY_START, "play", 4), "pause", 4);
    expect(replayReducer(paused, "tick", 4)).toBe(paused);
  });
});

describe("retries", () => {
  it("backs off 2 s then 8 s", () => {
    expect(backoffDelays(2)).toEqual([2, 8]);
    expect(backoffDelays(0)).toEqual([]);
  });

  it("cuts slow attempts at the timeout and sends the third to the fallback", () => {
    const a = scheduleAttempts([75, 90, 14]);
    expect(a.map((x) => [x.provider, x.outcome, x.startS, x.endS])).toEqual([
      ["primary", "timeout", 0, 60],
      ["primary", "timeout", 62, 122],
      ["fallback", "ok", 130, 144],
    ]);
  });

  it("stops at the first success", () => {
    expect(scheduleAttempts([12, 5, 5])).toHaveLength(1);
  });

  it("gives up after the retries run out", () => {
    const a = scheduleAttempts([90, 90, 90, 90]);
    expect(a).toHaveLength(3);
    expect(a.every((x) => x.outcome === "timeout")).toBe(true);
  });

  it("matches the timeout case on the page", () => {
    expect(RETRY_ATTEMPTS.map((a) => a.at)).toEqual(["11:40:00", "11:41:02", "11:42:10"]);
  });
});

describe("dedupeRequests", () => {
  it("accepts the first request per key and drops repeats", () => {
    const r = dedupeRequests([
      { id: "evt-1", key: "bw142-build-1", at: "10:14:01" },
      { id: "evt-2", key: "bw142-build-1", at: "10:14:06" },
      { id: "evt-3", key: "bw87-build-1", at: "10:15:00" },
    ]);
    expect(r.accepted.map((x) => x.id)).toEqual(["evt-1", "evt-3"]);
    expect(r.dropped).toEqual([{ request: { id: "evt-2", key: "bw142-build-1", at: "10:14:06" }, duplicateOf: "evt-1" }]);
  });

  it("remembers keys seen before", () => {
    const r = dedupeRequests([{ id: "evt-9", key: "k", at: "" }], new Map([["k", "evt-1"]]));
    expect(r.accepted).toEqual([]);
    expect(r.dropped[0]!.duplicateOf).toBe("evt-1");
  });
});

describe("resumePlan", () => {
  it("resumes after the last checkpoint written before the crash", () => {
    expect(resumePlan([1, 2, 3], 4)).toEqual({ checkpoint: "ckpt-3", kept: [1, 2, 3], redo: [4] });
  });

  it("redoes everything with no checkpoint", () => {
    expect(resumePlan([], 2)).toEqual({ checkpoint: null, kept: [], redo: [1, 2] });
  });

  it("ignores a checkpoint for the loop that crashed", () => {
    expect(resumePlan([1, 2], 2).checkpoint).toBe("ckpt-1");
  });
});

describe("admission", () => {
  it("holds the second run editing the same file", () => {
    const out = admit([run({ id: "a", state: "running", files: ["price.ts"], enqueued: 1 }), run({ id: "b", files: ["price.ts"], enqueued: 2 })]);
    expect(out[1]).toMatchObject({ state: "held", heldBy: "a" });
  });

  it("gives a file to the earlier run when both are queued", () => {
    const out = admit([run({ id: "late", files: ["f"], enqueued: 5 }), run({ id: "early", files: ["f"], enqueued: 1 })]);
    expect(out.find((r) => r.id === "early")!.state).toBe("running");
    expect(out.find((r) => r.id === "late")).toMatchObject({ state: "held", heldBy: "early" });
  });

  it("respects the per-team and total limits", () => {
    const limits = { perTeam: 1, total: 2, tokensPerMin: 1e9 };
    const out = admit(
      [run({ id: "a", enqueued: 1 }), run({ id: "b", enqueued: 2 }), run({ id: "c", team: "Mobile", enqueued: 3 }), run({ id: "d", team: "Payments", enqueued: 4 })],
      limits,
    );
    expect(out.map((r) => r.state)).toEqual(["running", "queued", "running", "queued"]);
  });

  it("waits on the provider's token limit", () => {
    const out = admit([run({ id: "a", state: "running", tpm: 500 }), run({ id: "b", tpm: 200, enqueued: 1 })], { perTeam: 9, total: 9, tokensPerMin: 600 });
    expect(out[1]!.state).toBe("rate-limited");
  });

  it("does not let a later run overtake one waiting on tokens", () => {
    const out = admit([run({ id: "a", state: "running", tpm: 500 }), run({ id: "b", tpm: 200, enqueued: 1 }), run({ id: "c", tpm: 50, enqueued: 2 })], {
      perTeam: 9,
      total: 9,
      tokensPerMin: 600,
    });
    expect(out.map((r) => r.state)).toEqual(["running", "rate-limited", "queued"]);
  });

  it("does not touch blocked runs", () => {
    expect(admit([run({ id: "a", state: "blocked" })])[0]!.state).toBe("blocked");
  });
});

describe("stepQueue", () => {
  it("releases a held run once the holder merges, rebased", () => {
    let q = [run({ id: "a", state: "review", review: 1, files: ["f"], enqueued: 1 }), run({ id: "b", state: "held", heldBy: "a", files: ["f"], enqueued: 2 })];
    expect(fileLocks(q).get("f")).toBe("a");
    q = stepQueue(q);
    expect(q[0]!.state).toBe("done");
    expect(q[1]).toMatchObject({ state: "running", rebased: true });
    expect(describeTick([run({ id: "b", state: "held" })], [q[1]!])).toEqual(["b rebased onto main and started"]);
  });

  it("moves running work into review, then merges", () => {
    let q = [run({ id: "a", state: "running", work: 1, review: 1 })];
    q = stepQueue(q);
    expect(q[0]!.state).toBe("review");
    q = stepQueue(q);
    expect(q[0]!.state).toBe("done");
  });
});

describe("the queue on the page", () => {
  const frames = simulate(QUEUE, QUEUE_TICKS);

  it("starts with every state on show and the token limit binding", () => {
    const states = new Set(QUEUE.map((r) => r.state));
    for (const s of ["queued", "running", "review", "held", "rate-limited", "blocked", "done"]) expect(states.has(s as QueuedRun["state"])).toBe(true);
    expect(tokensInUse(QUEUE)).toBe(560_000);
  });

  it("is already settled: admitting again changes nothing", () => {
    const again = admit(QUEUE);
    const changed = again.filter((r, i) => r.state !== QUEUE[i]!.state).map((r) => r.id);
    expect(changed).toEqual([]);
  });

  it("rebases the held price.ts run after run_a210 merges", () => {
    const b388 = frames[1]!.find((r) => r.id === "run_b388")!;
    expect(b388).toMatchObject({ state: "running", rebased: true });
  });

  it("never runs over the token limit", () => {
    for (const f of frames) expect(tokensInUse(f)).toBeLessThanOrEqual(600_000);
  });

  it("lets the rate-limited run start once tokens free up", () => {
    expect(frames.some((f) => f.find((r) => r.id === "run_d077")!.state === "running")).toBe(true);
  });

  it("describes every tick", () => {
    for (let i = 1; i < frames.length; i++) expect(describeTick(frames[i - 1]!, frames[i]!).length).toBeGreaterThan(0);
  });
});

describe("page data", () => {
  it("bills the build at the medium model price: 5.8M tokens, $14.50", () => {
    expect(RUN_STEPS.reduce((s, x) => s + x.tokens, 0)).toBe(5_800_000);
    expect(RUN_STEPS.reduce((s, x) => s + stepCost(x), 0)).toBeCloseTo(14.5, 2);
    expect(costUsd(1_000_000, 2.5)).toBe(2.5);
  });

  it("records the locked-test refusal before the code fix", () => {
    const i = RUN_STEPS.findIndex((s) => s.status === "rejected");
    expect(RUN_STEPS[i]!.output).toContain("locked test manifest, hash a91c");
    expect(RUN_STEPS.slice(i).some((s) => s.output.includes("rounding.test.ts passes"))).toBe(true);
  });

  it("keeps fault-case times in order", () => {
    for (const c of FAULT_CASES) {
      const times = c.events.map((e) => e.at);
      expect([...times].sort()).toEqual(times);
    }
  });

  it("follows the rollout: pilots in month 2, the rest in months 4 to 6", () => {
    expect(TEAMS.filter((t) => t.joinedMonth === 2).map((t) => t.team)).toEqual(["Search", "Rebooking"]);
    expect(TEAMS.every((t) => t.joinedMonth === 2 || (t.joinedMonth >= 4 && t.joinedMonth <= 6))).toBe(true);
    const avg = (k: "cfr" | "cfrBaseline") => TEAMS.reduce((s, t) => s + t[k], 0) / TEAMS.length;
    expect(avg("cfrBaseline")).toBeCloseTo(12, 1);
    expect(avg("cfr")).toBeCloseTo(10.4, 1);
  });

  it("formats offsets", () => {
    expect(formatOffset(62)).toBe("+1:02");
  });
});

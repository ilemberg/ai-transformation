"use client";

import type { LozengeTone } from "@/features/line/components/jira";
import { QUEUE, QUEUE_CLOCK, QUEUE_TICK_MINUTES, QUEUE_TICKS } from "../data";
import { LIMITS, describeTick, runningCount, simulate, tokensInUse, type QueuedRun, type RunState } from "../logic";
import { ReplayControls, Tone } from "./ui";
import { useReplay } from "./useReplay";

const FRAMES = simulate(QUEUE, QUEUE_TICKS);
const TEAMS = [...new Set(QUEUE.map((r) => r.team))];
const FIRST_HOLDER = new Map(QUEUE.filter((r) => r.heldBy).map((r) => [r.id, r.heldBy!]));

const STATE: Record<RunState, { tone: LozengeTone; label: string }> = {
  queued: { tone: "neutral", label: "Queued" },
  running: { tone: "info", label: "Running" },
  review: { tone: "purple", label: "Waiting for review" },
  held: { tone: "warning", label: "Held" },
  "rate-limited": { tone: "warning", label: "Rate limited" },
  blocked: { tone: "danger", label: "Blocked" },
  done: { tone: "success", label: "Merged" },
};

const k = (n: number) => `${Math.round(n / 1000)}k`;

function clockAt(tick: number): string {
  const [h, m] = QUEUE_CLOCK.split(":").map(Number) as [number, number];
  const t = h * 60 + m + tick * QUEUE_TICK_MINUTES;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function note(r: QueuedRun, frame: readonly QueuedRun[]): string {
  const free = LIMITS.tokensPerMin - tokensInUse(frame);
  switch (r.state) {
    case "held":
      return `Edits ${r.files[0]}; waits for ${r.heldBy} to merge, then rebases`;
    case "rate-limited":
      return `Needs ${k(r.tpm)} tokens/min; ${k(free)} free under the provider limit`;
    case "blocked":
      return r.reason ?? "Waiting on a person";
    case "queued": {
      const ahead = frame.find((x) => x.state === "rate-limited" && x.enqueued < r.enqueued);
      return ahead ? `In line behind ${ahead.id} for tokens; no overtaking` : "Waiting for a slot";
    }
    case "running":
      return r.rebased ? `Rebased onto main after ${FIRST_HOLDER.get(r.id)} merged · ${k(r.tpm)} tokens/min` : `${k(r.tpm)} tokens/min`;
    case "review":
      return "Agent stopped; workspace kept for review fixes";
    case "done":
      return "Merged; workspace torn down";
  }
}

function Meter({ label, value, max, display, tone }: { label: string; value: number; max: number; display: string; tone: "brand" | "warn" }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="min-w-0 rounded-md border border-edge bg-card p-3 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-faint">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{display}</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-bg"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={display}
      >
        <div className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 ${tone === "warn" ? "bg-warn" : "bg-brand"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function QueueView() {
  const r = useReplay(QUEUE_TICKS, 1600);
  const tick = r.shown;
  const frame = FRAMES[tick]!;
  const changes = tick ? describeTick(FRAMES[tick - 1]!, frame) : [];
  const used = tokensInUse(frame);
  const waitingOnTokens = frame.some((x) => x.state === "rate-limited");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReplayControls
          label="the queue"
          playing={r.playing}
          atEnd={r.atEnd}
          atStart={r.atStart}
          onPlay={r.toggle}
          onStep={r.step}
          onReset={r.reset}
        />
        <p className="text-sm">
          <span className="font-mono text-lg font-semibold tabular-nums">{clockAt(tick)}</span>{" "}
          <span className="text-dim">
            tick {tick} of {QUEUE_TICKS} · {QUEUE_TICK_MINUTES} min each
          </span>
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Meter label="Running, all teams" value={runningCount(frame)} max={LIMITS.total} display={`${runningCount(frame)} / ${LIMITS.total}`} tone="brand" />
        <Meter
          label="Provider tokens per minute"
          value={used}
          max={LIMITS.tokensPerMin}
          display={`${k(used)} / ${k(LIMITS.tokensPerMin)}`}
          tone={waitingOnTokens ? "warn" : "brand"}
        />
        <div className="min-w-0 rounded-md border border-edge bg-card p-3 shadow-card sm:col-span-2 lg:col-span-1">
          <span className="text-xs text-faint">Running per team (limit {LIMITS.perTeam} each)</span>
          <ul className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
            {TEAMS.map((t) => (
              <li key={t} className="rounded-[3px] bg-neutral-bg px-1.5 py-0.5 tabular-nums">
                {t} <span className="font-semibold">{runningCount(frame, t)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 min-h-[3.25rem] rounded-md border border-edge bg-panel-2 p-2.5 text-sm" aria-live="polite">
        {changes.length ? (
          <ul key={tick} className="flash space-y-0.5 rounded-[3px]">
            {changes.map((c) => (
              <li key={c} className="font-mono text-xs">
                {clockAt(tick)} {c}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-dim">
            The queue at {QUEUE_CLOCK}. Press Play or Step to watch the scheduler admit, hold, rebase and merge.
          </p>
        )}
      </div>

      <div className="mt-3 overflow-x-auto rounded-md border border-edge" tabIndex={0} role="region" aria-label="Runs in the queue, scrolls sideways">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <caption className="sr-only">Every run at {clockAt(tick)}, with team, isolated workspace, files it edits, state and why.</caption>
          <thead className="bg-panel-2 text-xs font-semibold text-dim">
            <tr>
              <th scope="col" className="px-3 py-2">Run</th>
              <th scope="col" className="px-3 py-2">Ticket</th>
              <th scope="col" className="px-3 py-2">Team</th>
              <th scope="col" className="px-3 py-2">Workspace</th>
              <th scope="col" className="px-3 py-2">Edits</th>
              <th scope="col" className="px-3 py-2">State</th>
              <th scope="col" className="px-3 py-2">Why</th>
            </tr>
          </thead>
          <tbody>
            {frame.map((run) => (
              <tr key={run.id} className={`border-t border-edge align-top ${run.files.includes("src/booking/price.ts") ? "bg-warn-bg/40" : ""}`}>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{run.id}</td>
                <td className="px-3 py-2">
                  <span className="font-medium text-brand">{run.ticket}</span> <span className="text-dim">{run.title}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{run.team}</td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-faint">{run.workspace}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {run.files.map((f) => (
                    <div key={f}>{f}</div>
                  ))}
                </td>
                <td className="px-3 py-2">
                  <span key={`${run.id}-${run.state}-${tick}`} className={`inline-block rounded-[3px] p-0.5 ${tick && FRAMES[tick - 1]!.find((x) => x.id === run.id)!.state !== run.state ? "flash-ring" : ""}`}>
                    <Tone tone={STATE[run.state].tone}>{STATE[run.state].label}</Tone>
                  </span>
                </td>
                <td className="px-3 py-2 text-dim">{note(run, frame)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-dim">
        Highlighted rows edit the same file, <code className="rounded-[3px] bg-neutral-bg px-1">src/booking/price.ts</code>. The later run is held rather
        than run alongside, then rebased onto main when the first merges and started on the merged code.
      </p>
    </div>
  );
}

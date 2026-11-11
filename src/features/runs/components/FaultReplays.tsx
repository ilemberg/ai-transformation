"use client";

import { FAULT_CASES, MEDIUM_USD_PER_M, RETRY_ATTEMPTS, type FaultCase, type FaultTone } from "../data";
import { costUsd, formatUsd } from "../logic";
import { ActorAvatar, ReplayControls, actorName } from "./ui";
import { useReplay } from "./useReplay";

const DOT: Record<FaultTone, string> = {
  neutral: "bg-system",
  info: "bg-brand",
  bad: "bg-fail",
  good: "bg-pass",
};

export function FaultReplays() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {FAULT_CASES.map((c) => (
        <FaultCard key={c.id} fault={c} />
      ))}
    </div>
  );
}

function FaultCard({ fault }: { fault: FaultCase }) {
  const r = useReplay(fault.events.length);
  const latest = r.shown ? fault.events[r.shown - 1] : undefined;

  return (
    <article className="flex min-w-0 flex-col rounded-md border border-edge bg-card p-3 shadow-card sm:p-4" aria-labelledby={`fault-${fault.id}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={`fault-${fault.id}`} className="font-semibold">
          {fault.title}
        </h3>
        <span className="font-mono text-xs text-faint">
          {fault.run} · {fault.ticket}
        </span>
      </header>
      <p className="mt-1 text-sm text-dim">{fault.summary}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <ReplayControls
          label={fault.title.toLowerCase()}
          playing={r.playing}
          atEnd={r.atEnd}
          atStart={r.atStart}
          onPlay={r.toggle}
          onStep={r.step}
          onReset={r.reset}
        />
        <span className="text-xs tabular-nums text-faint" aria-hidden>
          {r.shown} / {fault.events.length}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        {latest ? `${latest.at}, ${actorName(latest.actor)}: ${latest.text}` : ""}
      </p>

      <ol className="mt-3 space-y-0.5 border-l border-edge pl-3">
        {fault.events.map((e, i) => {
          const visible = i < r.shown;
          return (
            <li key={`${i}-${visible}`} className={`relative rounded-[3px] px-2 py-1 text-sm ${visible ? "flash" : "invisible"}`} aria-hidden={!visible}>
              <span aria-hidden className={`absolute -left-[17px] top-2.5 h-2 w-2 rounded-full ring-2 ring-card ${DOT[e.tone]}`} />
              <span className="flex items-start gap-2">
                <ActorAvatar id={e.actor} size={18} />
                <span className="min-w-0">
                  <span className="mr-1.5 font-mono text-xs text-faint">{e.at}</span>
                  <span className={e.tone === "bad" ? "text-fail-text" : ""}>{e.text}</span>
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {fault.id === "timeout" && <AttemptTable />}

      <div key={r.atEnd ? "end" : "run"} className={`mt-auto rounded-[3px] bg-info-bg p-2.5 text-sm text-info-text ${r.atEnd ? "flash-ring" : ""}`}>
        <span className="font-semibold">What the orchestrator does: </span>
        {fault.outcome}
      </div>
    </article>
  );
}

function AttemptTable() {
  return (
    <div className="mb-3 mt-2 overflow-x-auto rounded-[3px] border border-edge" tabIndex={0} role="region" aria-label="Attempts recorded for the timed-out call, scrolls sideways">
      <table className="w-full min-w-[420px] text-left text-xs">
        <caption className="sr-only">Each attempt with provider, outcome, latency, tokens and cost.</caption>
        <thead className="bg-panel-2 text-dim">
          <tr>
            <th scope="col" className="px-2 py-1">#</th>
            <th scope="col" className="px-2 py-1">Provider</th>
            <th scope="col" className="px-2 py-1">Outcome</th>
            <th scope="col" className="px-2 py-1 text-right">Latency</th>
            <th scope="col" className="px-2 py-1 text-right">Tokens in / out</th>
            <th scope="col" className="px-2 py-1 text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {RETRY_ATTEMPTS.map((a) => (
            <tr key={a.attempt} className="border-t border-edge">
              <td className="px-2 py-1">{a.attempt}</td>
              <td className="px-2 py-1 capitalize">{a.provider}</td>
              <td className={`px-2 py-1 ${a.outcome === "ok" ? "text-pass-text" : "text-fail-text"}`}>{a.outcome === "ok" ? "Answered" : "Timed out"}</td>
              <td className="px-2 py-1 text-right tabular-nums">{a.latencyS} s</td>
              <td className="px-2 py-1 text-right tabular-nums">
                {a.inputTokens / 1000}k / {a.outputTokens ? `${(a.outputTokens / 1000).toFixed(1)}k` : "0"}
              </td>
              <td className="px-2 py-1 text-right tabular-nums">{formatUsd(costUsd(a.inputTokens + a.outputTokens, MEDIUM_USD_PER_M))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

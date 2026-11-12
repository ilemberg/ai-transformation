"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Lozenge, type LozengeTone } from "@/features/line/components/jira";
import { MODEL_CALLS, traceHref, type CallOutcome } from "../data";
import { ALL, distinct, filterCalls, formatMs, formatPct, formatTokens, formatUsd, summarizeCalls, type CallFilter } from "../logic";
import { Scroller, Stat, TD, TH, TierDot } from "./ui";

const OUTCOME: Record<CallOutcome, { tone: LozengeTone; label: string }> = {
  ok: { tone: "success", label: "OK" },
  slow: { tone: "warning", label: "Slow" },
  fallback: { tone: "info", label: "Fallback" },
  error: { tone: "danger", label: "Error" },
};

const FEATURES = distinct(MODEL_CALLS.map((c) => c.feature));
const TIERS = ["small", "medium", "large"] as const;
const OUTCOMES = Object.keys(OUTCOME) as CallOutcome[];

function Select({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="truncate text-2xs font-semibold text-dim sm:text-xs">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-0 rounded-[3px] border border-edge-2 bg-card px-1.5 text-sm sm:px-2 text-ink hover:bg-hover"
      >
        <option value={ALL}>All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Phone only: each call as a compact card. */
function CallCards({ rows }: { rows: typeof MODEL_CALLS }) {
  if (rows.length === 0) return <p className="mt-4 rounded-md border border-edge px-3 py-6 text-center text-sm text-dim sm:hidden">No calls match.</p>;
  return (
    <ul className="mt-4 space-y-2 sm:hidden" aria-label="Model calls">
      {rows.map((c) => (
        <li key={c.id} className={`min-w-0 rounded-md border border-edge p-2.5 text-sm ${c.model.includes("canary") ? "bg-warn-bg" : "bg-card"}`}>
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-xs tabular-nums text-faint">{c.at}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{c.feature}</span>
            <Lozenge tone={OUTCOME[c.outcome].tone}>{OUTCOME[c.outcome].label}</Lozenge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <TierDot tier={c.tier} />
              <span className="truncate">{c.model}</span>
            </span>
            <span className={`tabular-nums ${c.outcome === "slow" ? "font-semibold text-warn" : "text-dim"}`}>{formatMs(c.latencyMs)}</span>
            <span className="tabular-nums text-dim">
              {formatTokens(c.tokensIn)} / {formatTokens(c.tokensOut)}
            </span>
            <span className="tabular-nums text-dim">{formatUsd(c.costUsd)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
            <span className={`rounded-[3px] px-1 ${c.cacheHit ? "bg-neutral-bg" : "text-faint"}`}>Cache {c.cacheHit ? "hit" : "miss"}</span>
            {c.fallback && <span className="rounded-[3px] bg-info-bg px-1 font-medium text-info-text">Fallback</span>}
            {c.evalScore != null && <span className="rounded-[3px] bg-neutral-bg px-1 tabular-nums">Eval {c.evalScore}</span>}
            {c.trace && (
              <Link href={traceHref(c.trace)} className="ml-auto font-mono text-brand hover:underline">
                {c.trace}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ModelCalls() {
  const [filter, setFilter] = useState<CallFilter>({ feature: ALL, tier: ALL, outcome: ALL });
  const rows = filterCalls(MODEL_CALLS, filter);
  const s = summarizeCalls(rows);
  const set = (key: keyof CallFilter) => (v: string) => setFilter((f) => ({ ...f, [key]: v }));
  const filtered = filter.feature !== ALL || filter.tier !== ALL || filter.outcome !== ALL;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 sm:grid-cols-[repeat(3,minmax(0,12rem))_auto] sm:items-end">
        <Select label="Feature" value={filter.feature} options={FEATURES.map((f) => ({ value: f, label: f }))} onChange={set("feature")} />
        <Select label="Model size" value={filter.tier} options={TIERS.map((t) => ({ value: t, label: t[0]!.toUpperCase() + t.slice(1) }))} onChange={set("tier")} />
        <Select label="Outcome" value={filter.outcome} options={OUTCOMES.map((o) => ({ value: o, label: OUTCOME[o].label }))} onChange={set("outcome")} />
        {filtered && (
          <button type="button" onClick={() => setFilter({ feature: ALL, tier: ALL, outcome: ALL })} className="col-span-3 h-9 justify-self-start rounded-[3px] px-3 sm:col-span-1 text-sm font-medium text-dim hover:bg-hover hover:text-ink">
            Clear filters
          </button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-live="polite">
        <Stat label="Calls" value={s.calls} />
        <Stat label="p95 latency" value={formatMs(s.p95Ms)} />
        <Stat label="Cost" value={formatUsd(s.costUsd)} />
        <Stat label="Cache hit rate" value={formatPct(s.cacheRate)} />
        <Stat label="Fallback rate" value={formatPct(s.fallbackRate)} tone={s.fallbackRate > 0.1 ? "warn" : undefined} />
      </dl>

      <CallCards rows={rows} />

      <Scroller label="Model calls, scrolls sideways" className="mt-4 hidden sm:block">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <caption className="sr-only">Model calls on Tue 3 Nov 2026 from 13:40 to 14:40, with the BW-158 canary at 14:20 and its rollback at 14:24.</caption>
          <thead className="bg-panel-2 text-xs text-dim">
            <tr>
              <th scope="col" className={TH}>Time</th>
              <th scope="col" className={TH}>Feature</th>
              <th scope="col" className={TH}>Model</th>
              <th scope="col" className={`${TH} text-right`}>Latency</th>
              <th scope="col" className={`${TH} text-right`}>Tokens in / out</th>
              <th scope="col" className={`${TH} text-right`}>Cost</th>
              <th scope="col" className={TH}>Cache</th>
              <th scope="col" className={TH}>Fallback</th>
              <th scope="col" className={TH}>Outcome</th>
              <th scope="col" className={`${TH} text-right`}>Eval</th>
              <th scope="col" className={TH}>Trace</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-dim">
                  No calls match.
                </td>
              </tr>
            )}
            {rows.map((c) => {
              const canary = c.model.includes("canary");
              return (
                <tr key={c.id} className={`border-t border-edge hover:bg-hover ${canary ? "bg-warn-bg" : ""}`}>
                  <td className={`${TD} font-mono text-xs tabular-nums`}>{c.at}</td>
                  <td className={TD}>{c.feature}</td>
                  <td className={TD}>
                    <span className="inline-flex items-center gap-1.5">
                      <TierDot tier={c.tier} />
                      {c.model}
                    </span>
                  </td>
                  <td className={`${TD} text-right tabular-nums ${c.outcome === "slow" ? "font-semibold text-warn" : ""}`}>{formatMs(c.latencyMs)}</td>
                  <td className={`${TD} text-right tabular-nums`}>
                    {formatTokens(c.tokensIn)} / {formatTokens(c.tokensOut)}
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{formatUsd(c.costUsd)}</td>
                  <td className={TD}>{c.cacheHit ? "Hit" : <span className="text-faint">Miss</span>}</td>
                  <td className={TD}>{c.fallback ? <span className="font-medium">Yes</span> : <span className="text-faint">No</span>}</td>
                  <td className={TD}>
                    <Lozenge tone={OUTCOME[c.outcome].tone}>{OUTCOME[c.outcome].label}</Lozenge>
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{c.evalScore ?? <span className="text-faint">–</span>}</td>
                  <td className={TD}>
                    {c.trace ? (
                      <Link href={traceHref(c.trace)} className="font-mono text-xs text-brand hover:underline">
                        {c.trace}
                      </Link>
                    ) : (
                      <span className="text-faint">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Scroller>
      <p className="mt-2 text-xs text-dim">Tue 3 Nov, 13:40–14:40. Shaded: the new model on the BW-158 canary (10% from 14:20). Rolled back at 14:24; after that the old model takes over.</p>
    </div>
  );
}

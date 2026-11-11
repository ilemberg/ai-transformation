"use client";

import { useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Lozenge, type LozengeTone } from "@/features/line/components/jira";
import { DEFAULT_TRACE_ID, TRACES, TRACE_IDS, traceById, traceHref, type Span, type Trace, type TraceStatus } from "../data";
import { formatMs, layoutWaterfall, parseTraceId, traceDuration, waterfallTicks } from "../logic";

export const TRACE_TONE: Record<TraceStatus, { tone: LozengeTone; label: string }> = {
  ok: { tone: "success", label: "OK" },
  slow: { tone: "warning", label: "Slow" },
  fallback: { tone: "info", label: "Fallback" },
  error: { tone: "danger", label: "Error" },
};

const SPAN_TONE: Record<Span["status"], { tone: LozengeTone; label: string }> = {
  ok: { tone: "success", label: "OK" },
  slow: { tone: "warning", label: "Slow" },
  error: { tone: "danger", label: "Error" },
};

function barClass(s: Span): string {
  if (s.status === "error") return "bg-fail";
  if (s.status === "slow") return "bg-warn";
  if (s.kind === "model") return s.tier === "large" ? "bg-large" : s.tier === "small" ? "bg-small" : "bg-medium";
  if (s.kind === "edge" || s.kind === "gateway") return "bg-system";
  if (s.kind === "cache" || s.kind === "db") return "bg-purple";
  if (s.kind === "tool") return "bg-edge-2";
  return "bg-brand";
}

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** Reads `?trace=` (or `#tr_…`); must sit inside a Suspense boundary. */
export function TraceExplorer() {
  const params = useSearchParams();
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  return <TraceView traceId={parseTraceId(params.get("trace"), hash, TRACE_IDS, DEFAULT_TRACE_ID)} />;
}

/** Same view with a fixed trace, for the Suspense fallback. */
export function TraceView({ traceId }: { traceId: string }) {
  const trace = traceById(traceId);
  return (
    <div>
      <div role="group" aria-label="Choose a trace" className="flex flex-wrap gap-2">
        {TRACES.map((t) => {
          const on = t.id === trace.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => window.history.replaceState(null, "", traceHref(t.id))}
              className={`flex min-h-11 items-center gap-2 rounded-[3px] border px-3 py-1.5 text-left text-sm ${
                on ? "border-brand bg-selected text-ink" : "border-edge bg-card text-dim hover:bg-hover hover:text-ink"
              }`}
            >
              <Lozenge tone={TRACE_TONE[t.status].tone}>{TRACE_TONE[t.status].label}</Lozenge>
              <span className="font-mono text-xs">{t.id}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>
      <TraceBody key={trace.id} trace={trace} />
    </div>
  );
}

function TraceBody({ trace }: { trace: Trace }) {
  const [selected, setSelected] = useState(trace.focus);
  const rows = layoutWaterfall(trace.spans);
  const total = traceDuration(trace.spans);
  const ticks = waterfallTicks(total);
  const span = trace.spans.find((s) => s.id === selected) ?? trace.spans[0]!;

  return (
    <div className="mt-4">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-dim">Trace</dt>
          <dd className="font-mono">{trace.id}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-dim">Request</dt>
          <dd className="font-mono text-xs leading-5">{trace.request}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-dim">Total</dt>
          <dd className="font-semibold tabular-nums">{formatMs(total)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-dim">When</dt>
          <dd>{trace.at}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt className="text-dim">Release</dt>
          <dd className="flex items-center gap-1.5">
            <Lozenge tone="purple">Deploy</Lozenge>
            <span className="font-mono text-xs">{trace.release}</span>
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-dim">Ticket</dt>
          <dd className="font-medium text-brand">{trace.ticket}</dd>
        </div>
      </dl>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-x-auto rounded-md border border-edge bg-card" tabIndex={0} role="region" aria-label={`Waterfall for ${trace.id}, scrolls sideways`}>
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[220px_1fr] border-b border-edge bg-panel-2 text-xs text-dim">
              <div className="px-3 py-1.5 font-semibold">Span</div>
              <div className="relative mr-14 h-7" aria-hidden>
                {ticks.map((t) => (
                  <span key={t} className="absolute top-1.5 -translate-x-1/2 tabular-nums first:translate-x-0" style={{ left: `${(t / total) * 100}%` }}>
                    {formatMs(t)}
                  </span>
                ))}
              </div>
            </div>
            <ul aria-label="Spans">
              {rows.map(({ span: s, depth, left, width }) => {
                const on = s.id === span.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${s.service}: ${s.name}, starts at ${formatMs(s.start)}, takes ${formatMs(s.duration)}${s.status === "ok" ? "" : `, ${s.status}`}`}
                      onClick={() => setSelected(s.id)}
                      className={`grid w-full grid-cols-[220px_1fr] items-center text-left text-sm ${on ? "bg-selected" : "hover:bg-hover"}`}
                    >
                      <span className="flex min-w-0 items-center gap-1 py-1.5 pr-2" style={{ paddingLeft: 12 + depth * 12 }}>
                        <span className="min-w-0">
                          <span className="block truncate text-xs text-dim">{s.service}</span>
                          <span className={`block truncate ${on ? "font-semibold" : ""}`}>{s.name}</span>
                        </span>
                      </span>
                      <span className="relative mr-14 block h-8">
                        {ticks.map((t) => (
                          <span key={t} aria-hidden className="absolute inset-y-0 w-px bg-edge" style={{ left: `${(t / total) * 100}%` }} />
                        ))}
                        <span
                          aria-hidden
                          className={`absolute top-2.5 h-3 rounded-[2px] ${barClass(s)} ${on ? "ring-2 ring-brand ring-offset-1 ring-offset-card" : ""}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                        <span aria-hidden className="absolute top-2 whitespace-nowrap pl-1 text-xs tabular-nums text-dim" style={{ left: `${left + width}%` }}>
                          {formatMs(s.duration)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <aside aria-label="Span details" aria-live="polite" className="rounded-md border border-edge bg-card p-4 shadow-card lg:self-start">
          <p className="text-xs text-dim">{span.service}</p>
          <h3 className="mt-0.5 font-semibold">{span.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Lozenge tone={SPAN_TONE[span.status].tone}>{SPAN_TONE[span.status].label}</Lozenge>
            <span className="tabular-nums">{formatMs(span.duration)}</span>
            <span className="text-faint">at +{formatMs(span.start)}</span>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-t border-edge pt-3 text-sm">
            <dt className="text-dim">span_id</dt>
            <dd className="break-words font-mono text-xs leading-5">
              {trace.id}.{span.id}
            </dd>
            <dt className="text-dim">kind</dt>
            <dd>{span.kind}</dd>
            {span.attrs.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-mono text-xs leading-5 text-dim">{k}</dt>
                <dd className="break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </div>
  );
}

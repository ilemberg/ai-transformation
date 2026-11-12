"use client";

import { useState } from "react";
import { Lozenge, type LozengeTone } from "@/features/line/components/jira";
import { BUDGET_DAYS, BUDGET_MINUTES, DAYS, JOURNEYS, SLO_TARGET, type DayId, type Journey, type Marker } from "../data";
import { budgetLeftMinutes, burnRate, burnStatus, dayPct, daySeries, formatMs, linePoints, type BurnStatus } from "../logic";
import { Scroller, TD, TH } from "./ui";

const STATUS: Record<BurnStatus, { tone: LozengeTone; label: string }> = {
  burning: { tone: "danger", label: "Burning" },
  watch: { tone: "warning", label: "Watch" },
  healthy: { tone: "success", label: "Healthy" },
};

const MARKER_STROKE: Record<Marker["tone"], string> = {
  deploy: "stroke-brand",
  rollback: "stroke-fail",
  alert: "stroke-warn",
  flag: "stroke-purple",
};

const MARKER_DOT: Record<Marker["tone"], string> = {
  deploy: "bg-brand",
  rollback: "bg-fail",
  alert: "bg-warn",
  flag: "bg-purple",
};

function Burn({ value }: { value: number }) {
  return <span className={`tabular-nums ${value > 1 ? "font-semibold text-warn" : ""}`}>{value.toFixed(1)}x</span>;
}

function BudgetBar({ left }: { left: number }) {
  const pct = Math.max(0, Math.min(100, (left / BUDGET_MINUTES) * 100));
  const tone = pct < 25 ? "bg-fail" : pct < 50 ? "bg-warn" : "bg-pass";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-bg" aria-hidden>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums">
        {left.toFixed(1)} <span className="text-faint">of {BUDGET_MINUTES.toFixed(1)} min</span>
      </span>
    </div>
  );
}

const W = 300;
const LAT_H = 56;
const ERR_H = 18;

function JourneyChart({ journey, day, seed }: { journey: Journey; day: DayId; seed: number }) {
  const { events, markers } = journey.days[day];
  const { latency, errors } = daySeries(journey.baseLatencyMs, journey.baseErrorPct, events, seed);
  const latMax = Math.max(...latency) * 1.1;
  const errMax = Math.max(0.2, ...errors);
  const peak = Math.max(...latency);
  const peakErr = Math.max(...errors);
  const step = W / (errors.length - 1);

  return (
    <figure className="min-w-0 rounded-md border border-edge bg-card p-3">
      <figcaption className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{journey.name}</span>
        <span className="text-xs text-dim tabular-nums">
          p95 peak {formatMs(peak)} · errors peak {peakErr.toFixed(2)}%
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${LAT_H + ERR_H + 4}`}
        preserveAspectRatio="none"
        className="mt-2 block h-20 w-full"
        role="img"
        aria-label={`${journey.name}: p95 latency and error rate over 24 hours, peak ${formatMs(peak)} and ${peakErr.toFixed(2)}%.${
          markers.length ? ` Markers: ${markers.map((m) => `${m.at} ${m.label}`).join("; ")}.` : ""
        }`}
      >
        <line x1="0" x2={W} y1={LAT_H} y2={LAT_H} className="stroke-edge" vectorEffect="non-scaling-stroke" />
        <polyline points={linePoints(latency, W, LAT_H - 2, 0, latMax)} fill="none" className="stroke-brand" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {errors.map((e, i) => {
          const h = (e / errMax) * ERR_H;
          return <rect key={i} x={i * step - step * 0.35} y={LAT_H + 4 + ERR_H - h} width={step * 0.7} height={h} className="fill-fail" opacity={e > 0.1 ? 1 : 0.45} />;
        })}
        {markers.map((m) => {
          const x = (dayPct(m.at) / 100) * W;
          return (
            <line
              key={m.at + m.label}
              x1={x}
              x2={x}
              y1="0"
              y2={LAT_H + ERR_H + 4}
              className={MARKER_STROKE[m.tone]}
              strokeWidth="1.5"
              strokeDasharray={m.tone === "deploy" ? "3 2" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-2xs tabular-nums text-faint" aria-hidden>
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
      {markers.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs">
          {markers.map((m) => (
            <li key={m.at + m.label} className="flex items-center gap-1.5">
              <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${MARKER_DOT[m.tone]}`} />
              <span className="tabular-nums text-dim">{m.at}</span>
              <span>{m.label}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

export function ServiceHealth() {
  const [day, setDay] = useState<DayId>("2026-11-03");

  return (
    <div>
      <ul className="space-y-2 sm:hidden" aria-label="Journey health">
        {JOURNEYS.map((j) => {
          const b1 = burnRate(j.errorPct1h, SLO_TARGET);
          const b6 = burnRate(j.errorPct6h, SLO_TARGET);
          const st = STATUS[burnStatus(b1, b6)];
          return (
            <li key={j.id} className="min-w-0 rounded-md border border-edge bg-card p-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 font-medium">{j.name}</span>
                <Lozenge tone={st.tone}>{st.label}</Lozenge>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                <span className="tabular-nums">
                  <span className="text-faint">Uptime, {BUDGET_DAYS} d </span>
                  {j.uptimePct.toFixed(2)}% <span className="text-faint">/ {SLO_TARGET}%</span>
                </span>
                <span className="text-faint">
                  Burn 1 h{" "}
                  <span className="text-ink">
                    <Burn value={b1} />
                  </span>{" "}
                  · 6 h{" "}
                  <span className="text-ink">
                    <Burn value={b6} />
                  </span>
                </span>
              </div>
              <div className="mt-1.5 text-xs">
                <span className="text-faint">Error budget left</span>
                <BudgetBar left={budgetLeftMinutes(j.uptimePct, SLO_TARGET, BUDGET_DAYS)} />
              </div>
            </li>
          );
        })}
      </ul>

      <Scroller label="Journey health, scrolls sideways" className="hidden sm:block">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <caption className="sr-only">
            For each user journey: uptime over {BUDGET_DAYS} days against the {SLO_TARGET}% target, error budget left, burn rate over 1 and 6 hours, and status.
          </caption>
          <thead className="bg-panel-2 text-xs text-dim">
            <tr>
              <th scope="col" className={TH}>Journey</th>
              <th scope="col" className={`${TH} text-right`}>Uptime, {BUDGET_DAYS} d</th>
              <th scope="col" className={TH}>Error budget left</th>
              <th scope="col" className={`${TH} text-right`}>Burn 1 h</th>
              <th scope="col" className={`${TH} text-right`}>Burn 6 h</th>
              <th scope="col" className={TH}>Status</th>
            </tr>
          </thead>
          <tbody>
            {JOURNEYS.map((j) => {
              const b1 = burnRate(j.errorPct1h, SLO_TARGET);
              const b6 = burnRate(j.errorPct6h, SLO_TARGET);
              const st = STATUS[burnStatus(b1, b6)];
              return (
                <tr key={j.id} className="border-t border-edge hover:bg-hover">
                  <th scope="row" className={`${TD} font-medium`}>{j.name}</th>
                  <td className={`${TD} text-right tabular-nums`}>
                    {j.uptimePct.toFixed(2)}% <span className="text-faint">/ {SLO_TARGET}%</span>
                  </td>
                  <td className={TD}>
                    <BudgetBar left={budgetLeftMinutes(j.uptimePct, SLO_TARGET, BUDGET_DAYS)} />
                  </td>
                  <td className={`${TD} text-right`}>
                    <Burn value={b1} />
                  </td>
                  <td className={`${TD} text-right`}>
                    <Burn value={b6} />
                  </td>
                  <td className={TD}>
                    <Lozenge tone={st.tone}>{st.label}</Lozenge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Scroller>
      <p className="mt-2 text-xs text-dim">As of Wed 11 Nov, 09:00. Burn 1x spends the budget in exactly {BUDGET_DAYS} days; 14.4x over 1 h or 6x over 6 h pages.</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">24 hours: p95 latency and errors</h3>
        <div role="group" aria-label="Choose a day" className="flex flex-wrap gap-1 rounded-[3px] bg-neutral-bg p-0.5">
          {DAYS.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={day === d.id}
              onClick={() => setDay(d.id)}
              className={`min-h-9 rounded-[3px] px-3 text-sm font-medium ${day === d.id ? "bg-card text-brand shadow-card" : "text-dim hover:text-ink"}`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-brand" /> p95 latency
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-fail" /> error %
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0 border-l-2 border-dashed border-brand" /> deploy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 bg-fail" /> rollback
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 bg-warn" /> alert
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 bg-purple" /> flag
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {JOURNEYS.map((j, i) => (
          <JourneyChart key={`${j.id}-${day}`} journey={j} day={day} seed={i + (day === "2026-11-03" ? 3 : 9)} />
        ))}
      </div>
    </div>
  );
}

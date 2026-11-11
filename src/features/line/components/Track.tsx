"use client";

import { useEffect, useRef } from "react";
import { LANES, STATIONS } from "../stations";
import type { Ticket } from "../types";
import { isStationDone, type Cursor } from "../logic";

const N = STATIONS.length;
const center = (i: number) => ((i + 0.5) / N) * 100;

/** Each lane with the first station it covers and how many stations it spans. */
const LANE_SPANS = LANES.map((lane) => ({
  lane,
  start: STATIONS.findIndex((s) => s.lane === lane.id),
  span: STATIONS.filter((s) => s.lane === lane.id).length,
}));

/**
 * The line itself: ten stations in four lanes, the ticket travelling along
 * it, and the bug loop curving back from the last station to the first.
 */
export function Track({
  ticket,
  cursor,
  onPick,
}: {
  ticket: Ticket;
  cursor: Cursor;
  onPick: (station: number) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const done = isStationDone(ticket, cursor);
  const progress = center(cursor.station);
  const looping = cursor.station === N - 1;

  // On a phone the track scrolls sideways; keep the ticket in view.
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const x = (center(cursor.station) / 100) * el.scrollWidth - el.clientWidth / 2;
    el.scrollTo({ left: x, behavior: "smooth" });
  }, [cursor.station]);

  return (
    <div ref={scroller} className="-mx-4 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-1 sm:mx-0 sm:px-0">
      <div className="relative min-w-[880px]">
        {/* Lanes */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
          {LANE_SPANS.map(({ lane, start, span }) => {
            const active = cursor.station >= start && cursor.station < start + span;
            return (
              <div
                key={lane.id}
                style={{ gridColumn: `span ${span} / span ${span}` }}
                className={`rounded-lg border px-3 py-1.5 transition-colors ${
                  active ? "border-edge-2 bg-panel-2" : "border-transparent"
                }`}
              >
                <div className={`text-xs font-semibold ${active ? "text-ink" : "text-dim"}`}>{lane.id}</div>
                <div className="truncate text-[11px] text-faint">{lane.blurb}</div>
              </div>
            );
          })}
        </div>

        {/* Rail, progress and the moving ticket */}
        <div className="relative mt-5 h-16">
          <div className="absolute inset-x-[5%] top-1/2 h-[3px] -translate-y-1/2 rounded bg-edge" />
          <div
            className="absolute left-[5%] top-1/2 h-[3px] -translate-y-1/2 rounded bg-gradient-to-r from-speed via-medium to-quality transition-[width] duration-700 ease-out"
            style={{ width: `${progress - 5}%` }}
          />
          {STATIONS.map((station, i) => {
            const step = ticket.steps[i];
            const state = i < cursor.station || (i === cursor.station && done) ? "done" : i === cursor.station ? "now" : "next";
            const light = step.mode !== "full";
            return (
              <button
                key={station.id}
                type="button"
                onClick={() => onPick(i)}
                aria-label={`Station ${i + 1}: ${station.name}${light ? ` (${step.mode})` : ""}`}
                aria-current={i === cursor.station ? "step" : undefined}
                className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${center(i)}%` }}
              >
                {i === cursor.station && !done && (
                  <span aria-hidden className="pulse-ring absolute inset-0 rounded-full bg-speed/50" />
                )}
                <span
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-sm font-semibold transition-all duration-300 ${
                    state === "done"
                      ? "border-quality bg-quality text-bg"
                      : state === "now"
                        ? "scale-110 border-speed bg-speed text-bg shadow-[0_0_24px_rgb(96_165_250/0.6)]"
                        : `bg-panel text-dim group-hover:border-dim ${light ? "border-dashed border-edge-2" : "border-edge-2"}`
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
              </button>
            );
          })}
          {/* The ticket token */}
          <div
            className="pointer-events-none absolute -top-5 -translate-x-1/2 transition-[left] duration-700 ease-out"
            style={{ left: `${progress}%` }}
          >
            <span className="whitespace-nowrap rounded-md border border-speed/60 bg-bg px-2 py-0.5 font-mono text-[11px] font-semibold text-speed shadow-[0_0_16px_rgb(96_165_250/0.35)]">
              {ticket.key}
            </span>
          </div>
        </div>

        {/* Names */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
          {STATIONS.map((station, i) => {
            const step = ticket.steps[i];
            return (
              <button
                key={station.id}
                type="button"
                tabIndex={-1}
                onClick={() => onPick(i)}
                className="flex flex-col items-center px-1 text-center"
              >
                <span className={`text-[13px] font-semibold ${i === cursor.station ? "text-ink" : "text-dim"}`}>
                  {station.name}
                </span>
                <span className="text-[11px] leading-snug text-faint">{station.tagline}</span>
                {step.mode !== "full" && (
                  <span className="mt-1 rounded border border-dashed border-edge-2 px-1.5 text-[10px] uppercase tracking-wide text-warn">
                    {step.mode}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* The bug loop: from the last station back to the first */}
        <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className="mt-1 h-12 w-full" aria-hidden>
          <path
            d={`M ${center(N - 1) * 10} 4 C ${center(N - 1) * 10} 56, ${center(N - 1) * 10 - 60} 56, 500 56 S ${center(0) * 10} 56, ${center(0) * 10} 4`}
            fill="none"
            strokeWidth={looping ? 2.5 : 1.5}
            strokeDasharray="6 6"
            vectorEffect="non-scaling-stroke"
            className={looping ? "dash-flow stroke-human" : "stroke-edge-2"}
          />
        </svg>
        <div className={`-mt-7 text-center text-[11px] ${looping ? "text-human" : "text-faint"}`}>
          bug loop: every incident re-enters at Intake with a failing test
        </div>
      </div>
    </div>
  );
}

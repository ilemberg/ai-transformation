"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMinutes, formatUsd, isFinished, jumpTo, LAST_STATION, START, tick, totalsAt, type Cursor } from "../logic";
import { TICKETS } from "../tickets";
import type { Ticket, TicketKind } from "../types";
import { StatusIcon } from "./icons";
import { JobLog } from "./JobLog";
import { TestStrip } from "./TestStrip";
import { WorkflowGraph } from "./WorkflowGraph";

const SPEEDS = [1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];

const KIND_LABEL: Record<TicketKind, string> = { feature: "Feature", bug: "Bug", performance: "Performance" };

function ticketById(id: string): Ticket {
  return TICKETS.find((t) => t.id === id) ?? TICKETS[0];
}

export function LineApp({ initialTicketId, initialStation }: { initialTicketId: string; initialStation: number | null }) {
  const [ticketId, setTicketId] = useState(initialTicketId);
  const ticket = ticketById(ticketId);
  const [cursor, setCursor] = useState<Cursor>(() =>
    initialStation === null ? START : jumpTo(ticketById(initialTicketId), initialStation),
  );
  const [playing, setPlaying] = useState(initialStation === null);
  const [speed, setSpeed] = useState<Speed>(1);

  // Playback: reveal one log line per beat, with a short pause on arriving at a job.
  useEffect(() => {
    if (!playing) return;
    const delay = (cursor.shown === 0 ? 600 : 1400) / speed;
    const timer = window.setTimeout(() => {
      const next = tick(ticket, cursor);
      if (next) setCursor(next);
      else setPlaying(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [playing, cursor, speed, ticket]);

  // The address bar carries the ticket and job, so a link opens at the same place.
  useEffect(() => {
    window.history.replaceState(window.history.state, "", `?t=${ticket.id}&s=${cursor.station + 1}`);
  }, [ticket.id, cursor.station]);

  const pickTicket = (id: string) => {
    setTicketId(id);
    setCursor(START);
    setPlaying(true);
  };

  const goTo = useCallback(
    (station: number) => {
      setPlaying(false);
      setCursor(jumpTo(ticket, station));
    },
    [ticket],
  );

  const togglePlay = useCallback(() => {
    if (isFinished(ticket, cursor)) {
      setCursor(START);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [ticket, cursor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(target.tagName)) return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        goTo(Math.min(LAST_STATION, cursor.station + 1));
      } else if (e.key === "ArrowLeft") {
        goTo(Math.max(0, cursor.station - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, goTo, cursor.station]);

  const finished = isFinished(ticket, cursor);
  const totals = totalsAt(ticket, cursor);

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 pt-5 sm:px-6">
      {/* Ticket picker */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Ticket">
        {TICKETS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => pickTicket(t.id)}
            aria-pressed={t.id === ticket.id}
            className={`h-8 rounded-md border px-3 text-sm font-medium ${
              t.id === ticket.id ? "border-accent bg-accent/10 text-accent" : "border-edge bg-panel-2 text-ink hover:bg-edge/40"
            }`}
          >
            {KIND_LABEL[t.kind]} <span className="font-mono text-xs opacity-70">{t.key}</span>
          </button>
        ))}
      </div>

      {/* Run header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-edge pb-4">
        <div className="flex w-full min-w-0 items-center gap-2 lg:w-auto lg:flex-1">
          <StatusIcon status={finished ? "success" : "running"} className="h-5 w-5" />
          <h1 className="min-w-0 text-lg font-normal leading-snug sm:text-2xl lg:truncate">
            {ticket.title} <span className="text-faint">#{ticket.key.split("-")[1]}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(Math.max(0, cursor.station - 1))}
            disabled={cursor.station === 0}
            aria-label="Previous job"
            className="h-8 w-8 rounded-md border border-edge bg-panel-2 text-dim hover:bg-edge/40 disabled:opacity-40"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="h-8 min-w-20 rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
          >
            {playing ? "Pause" : finished ? "Re-run" : "Run"}
          </button>
          <button
            type="button"
            onClick={() => goTo(Math.min(LAST_STATION, cursor.station + 1))}
            disabled={cursor.station === LAST_STATION}
            aria-label="Next job"
            className="h-8 w-8 rounded-md border border-edge bg-panel-2 text-dim hover:bg-edge/40 disabled:opacity-40"
          >
            ›
          </button>
          <div className="flex overflow-hidden rounded-md border border-edge" role="group" aria-label="Speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={`h-8 px-2 text-xs ${speed === s ? "bg-edge/60 font-semibold text-ink" : "bg-panel-2 text-dim"}`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-edge bg-edge text-sm sm:grid-cols-4">
        {[
          ["Source", ticket.source.split(",")[0]],
          ["Duration", formatMinutes(totals.wallMinutes)],
          ["Model spend", formatUsd(totals.aiUsd)],
          ["People's time", formatMinutes(totals.humanMinutes)],
        ].map(([k, v]) => (
          <div key={k} className="bg-panel px-4 py-2.5">
            <dt className="text-xs text-dim">{k}</dt>
            <dd className="truncate font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      {/* The workflow */}
      <section className="flex flex-col gap-4 rounded-md border border-edge bg-panel p-4 sm:p-5">
        <WorkflowGraph ticket={ticket} cursor={cursor} onPick={goTo} />
        <div className="border-t border-edge pt-3">
          <TestStrip ticket={ticket} cursor={cursor} />
        </div>
      </section>

      <JobLog ticket={ticket} cursor={cursor} />
    </main>
  );
}

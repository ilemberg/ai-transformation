"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isFinished, jumpTo, LAST_STATION, START, stepAt, tick, type Cursor } from "../logic";
import { TICKETS } from "../tickets";
import type { Ticket, TicketKind } from "../types";
import { CostMeter } from "./CostMeter";
import { Economics } from "./Economics";
import { Feed } from "./Feed";
import { StationCard } from "./StationCard";
import { TestWall } from "./TestWall";
import { Track } from "./Track";
import { SectionLabel } from "./ui";

const SPEEDS = [1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];

const KIND_STYLE: Record<TicketKind, string> = {
  feature: "text-medium border-medium/40 bg-medium/10",
  bug: "text-fail border-fail/40 bg-fail/10",
  performance: "text-large border-large/40 bg-large/10",
};

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

  // Playback: reveal one line per beat, with a short pause on arriving at a station.
  useEffect(() => {
    if (!playing) return;
    const delay = (cursor.shown === 0 ? 650 : 1500) / speed;
    const timer = window.setTimeout(() => {
      const next = tick(ticket, cursor);
      if (next) setCursor(next);
      else setPlaying(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [playing, cursor, speed, ticket]);

  // The address bar carries the ticket and station, so a link opens at the same place.
  useEffect(() => {
    const url = `?t=${ticket.id}&s=${cursor.station + 1}`;
    window.history.replaceState(window.history.state, "", url);
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
  const step = stepAt(ticket, cursor.station);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pt-8 sm:px-6 sm:pt-12">
      <section className="flex flex-col gap-4">
        <SectionLabel>An AI-native delivery line · sample run</SectionLabel>
        <h1 className="max-w-4xl text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.75rem]">
          Agents do the work.{" "}
          <span className="bg-gradient-to-r from-speed via-medium to-quality bg-clip-text text-transparent">
            Gates keep it honest.
          </span>
        </h1>
        <p className="max-w-3xl text-dim sm:text-lg">
          Pick a ticket and watch it travel from the backlog to production. Tests and evals are written before any
          code. A different model reviews what an agent wrote. Nothing reaches users without passing gates nobody can
          talk past, and every bug that escapes makes a gate stronger.
        </p>
      </section>

      <section
        aria-label="Pick a ticket"
        className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0"
      >
        {TICKETS.map((t) => {
          const active = t.id === ticket.id;
          return (
            <button
              key={t.id}
              type="button"
              ref={
                active
                  ? (el) => {
                      // On a phone the cards scroll sideways; keep the chosen one in view.
                      el?.parentElement?.scrollTo({ left: el.offsetLeft - 16 });
                    }
                  : undefined
              }
              onClick={() => pickTicket(t.id)}
              aria-pressed={active}
              className={`flex w-[78%] shrink-0 snap-start flex-col gap-2 rounded-xl border p-4 text-left transition-all md:w-auto ${
                active ? "border-speed/70 bg-panel-2 shadow-[0_0_0_1px_rgb(96_165_250/0.3)]" : "border-edge bg-panel/60 hover:border-edge-2"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${KIND_STYLE[t.kind]}`}>
                  {t.kind}
                </span>
                <span className="font-mono text-xs text-dim">{t.key}</span>
                <span className="font-mono text-xs text-faint">{t.priority}</span>
              </div>
              <span className="font-medium leading-snug">{t.title}</span>
              <span className="text-xs text-faint">From: {t.source}</span>
            </button>
          );
        })}
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-dim">{ticket.summary}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(Math.max(0, cursor.station - 1))}
              disabled={cursor.station === 0}
              className="h-9 rounded-md border border-edge px-3 text-sm text-dim hover:text-ink disabled:opacity-40"
              aria-label="Previous station"
            >
              ←
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="h-9 min-w-24 rounded-md bg-ink px-4 text-sm font-semibold text-bg hover:bg-white"
            >
              {playing ? "Pause" : finished ? "Replay" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => goTo(Math.min(LAST_STATION, cursor.station + 1))}
              disabled={cursor.station === LAST_STATION}
              className="h-9 rounded-md border border-edge px-3 text-sm text-dim hover:text-ink disabled:opacity-40"
              aria-label="Next station"
            >
              →
            </button>
            <div className="ml-1 flex overflow-hidden rounded-md border border-edge" role="group" aria-label="Speed">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  aria-pressed={speed === s}
                  className={`h-9 px-2.5 font-mono text-xs ${speed === s ? "bg-panel-2 text-ink" : "text-faint hover:text-dim"}`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>

        <Track ticket={ticket} cursor={cursor} onPick={goTo} />

        <Legend />

        <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
          <StationCard index={cursor.station} step={step} />
          <Feed ticket={ticket} cursor={cursor} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <TestWall ticket={ticket} cursor={cursor} />
          <CostMeter ticket={ticket} cursor={cursor} />
        </div>
        <p className="text-xs text-faint">Keys: space plays or pauses, ← and → move between stations.</p>
      </section>

      <Economics />

      <Link
        href="/metrics"
        className="group flex flex-col gap-2 rounded-2xl border border-edge bg-gradient-to-br from-panel-2 to-panel p-6 transition-colors hover:border-edge-2 sm:p-8"
      >
        <SectionLabel>Next</SectionLabel>
        <span className="text-2xl font-semibold tracking-tight">
          How do we know it is working? <span className="text-speed transition-transform group-hover:translate-x-1">→</span>
        </span>
        <span className="max-w-2xl text-dim">
          A year of an AI rollout in numbers: every speed metric paired with the quality metric that keeps it honest, and
          the rules that fire when one of them moves the wrong way.
        </span>
      </Link>
    </main>
  );
}

function Legend() {
  const items = [
    { dot: "bg-small", label: "Small model" },
    { dot: "bg-medium", label: "Medium model" },
    { dot: "bg-large", label: "Large model" },
    { dot: "bg-human", label: "Person" },
    { dot: "bg-system", label: "Automation" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-dim" aria-label="Colour key">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className={`h-2 w-2 rounded-full ${i.dot}`} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

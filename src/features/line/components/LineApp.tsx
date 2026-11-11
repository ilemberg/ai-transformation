"use client";

import { useCallback, useEffect, useState } from "react";
import { isFinished, jumpTo, LAST_STATION, START, tickAll, type Cursor } from "../logic";
import { TICKETS } from "../tickets";
import { Board } from "./Board";
import { IssuePanel } from "./IssuePanel";

const SPEEDS = [1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];
const BEAT_MS = 1300;

function startCursors(selectedId: string, station: number | null): Record<string, Cursor> {
  return Object.fromEntries(
    TICKETS.map((t) => [t.id, station !== null && t.id === selectedId ? jumpTo(t, station) : START]),
  );
}

export function LineApp({ initialTicketId, initialStation }: { initialTicketId: string; initialStation: number | null }) {
  const [selectedId, setSelectedId] = useState(initialTicketId);
  const [cursors, setCursors] = useState(() => startCursors(initialTicketId, initialStation));
  const [playing, setPlaying] = useState(initialStation === null);
  const [speed, setSpeed] = useState<Speed>(1);

  const ticket = TICKETS.find((t) => t.id === selectedId) ?? TICKETS[0];
  const cursor = cursors[ticket.id] ?? START;
  const allDone = TICKETS.every((t) => isFinished(t, cursors[t.id] ?? START));

  // Every beat, each unfinished ticket on the board moves on by one step.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const next = tickAll(TICKETS, cursors);
      if (next) setCursors(next);
      else setPlaying(false);
    }, BEAT_MS / speed);
    return () => window.clearTimeout(timer);
  }, [playing, cursors, speed]);

  // The address bar carries the selected ticket and its column.
  useEffect(() => {
    window.history.replaceState(window.history.state, "", `?t=${ticket.id}&s=${cursor.station + 1}`);
  }, [ticket.id, cursor.station]);

  const jump = useCallback(
    (station: number) => {
      setPlaying(false);
      setCursors((c) => ({ ...c, [ticket.id]: jumpTo(ticket, Math.max(0, Math.min(LAST_STATION, station))) }));
    },
    [ticket],
  );

  const toggle = useCallback(() => {
    if (allDone) {
      setCursors(startCursors(selectedId, null));
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [allDone, selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(target.tagName)) return;
      if (e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") jump(cursor.station + 1);
      else if (e.key === "ArrowLeft") jump(cursor.station - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, jump, cursor.station]);

  return (
    <main className="flex flex-col gap-4 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-dim">
        Projects <span className="text-faint">/</span> Bookwell
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-medium text-ink">Delivery board</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            className="h-8 min-w-24 rounded-[3px] bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hover"
          >
            {playing ? "Pause" : allDone ? "Start over" : "Start"}
          </button>
          <div className="flex rounded-[3px] bg-neutral-bg p-0.5" role="group" aria-label="Speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={`h-7 rounded-[3px] px-2 text-xs font-medium ${speed === s ? "bg-card text-brand shadow-card" : "text-dim"}`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <Board tickets={TICKETS} cursors={cursors} selectedId={ticket.id} onSelect={setSelectedId} />

      <IssuePanel ticket={ticket} cursor={cursor} onJump={jump} />
    </main>
  );
}

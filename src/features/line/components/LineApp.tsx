"use client";

import { useCallback, useEffect, useState } from "react";
import { isFinished, jumpTo, LAST_STATION, START, stepOne, type BoardEvent, type Cursor } from "../logic";
import { ACTORS, STATIONS } from "../stations";
import { TICKETS } from "../tickets";
import { Board } from "./Board";
import { IssuePanel } from "./IssuePanel";
import { Avatar } from "./jira";

const SPEEDS = [1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];
/** One event on the board every few seconds, so a viewer can follow each change. */
const BEAT_MS = 3200;

function startCursors(selectedId: string, station: number | null): Record<string, Cursor> {
  return Object.fromEntries(
    TICKETS.map((t) => [t.id, station !== null && t.id === selectedId ? jumpTo(t, station) : START]),
  );
}

export function LineApp({ initialTicketId, initialStation }: { initialTicketId: string; initialStation: number | null }) {
  const [selectedId, setSelectedId] = useState(initialTicketId);
  const [cursors, setCursors] = useState(() => startCursors(initialTicketId, initialStation));
  const [playing, setPlaying] = useState(initialStation === null);
  const [follow, setFollow] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);
  const [turn, setTurn] = useState(0);
  const [event, setEvent] = useState<BoardEvent | null>(null);

  const ticket = TICKETS.find((t) => t.id === selectedId) ?? TICKETS[0];
  const cursor = cursors[ticket.id] ?? START;
  const allDone = TICKETS.every((t) => isFinished(t, cursors[t.id] ?? START));

  // Each beat one ticket takes one step; with Follow on, the view moves to it.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => {
        const next = stepOne(TICKETS, cursors, turn, (event?.seq ?? 0) + 1);
        if (!next) {
          setPlaying(false);
          return;
        }
        setCursors(next.cursors);
        setTurn(next.turn);
        setEvent(next.event);
        if (follow) setSelectedId(next.event.ticketId);
      },
      event ? BEAT_MS / speed : 800,
    );
    return () => window.clearTimeout(timer);
  }, [playing, cursors, turn, speed, follow, event]);

  // The address bar carries the selected ticket and its column.
  useEffect(() => {
    window.history.replaceState(window.history.state, "", `?t=${ticket.id}&s=${cursor.station + 1}`);
  }, [ticket.id, cursor.station]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setFollow(false);
  }, []);

  const jump = useCallback(
    (station: number) => {
      setPlaying(false);
      setEvent(null);
      setCursors((c) => ({ ...c, [ticket.id]: jumpTo(ticket, Math.max(0, Math.min(LAST_STATION, station))) }));
    },
    [ticket],
  );

  const toggle = useCallback(() => {
    if (allDone) {
      setCursors(startCursors(selectedId, null));
      setTurn(0);
      setEvent(null);
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
    <main className="flex flex-col gap-4 px-4 pb-24 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-dim">
        Projects <span className="text-faint">/</span> Bookwell
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-medium text-ink">Delivery board</h1>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-dim">
            <span
              role="switch"
              aria-checked={follow}
              tabIndex={0}
              onClick={() => setFollow((f) => !f)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  setFollow((f) => !f);
                }
              }}
              className={`relative inline-block h-4 w-8 rounded-full transition-colors ${follow ? "bg-pass" : "bg-edge-2"}`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-[left] ${follow ? "left-[18px]" : "left-0.5"}`}
              />
            </span>
            Follow activity
          </label>
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

      <Board tickets={TICKETS} cursors={cursors} selectedId={ticket.id} onSelect={select} event={event} />

      <IssuePanel ticket={ticket} cursor={cursor} onJump={jump} event={event?.ticketId === ticket.id ? event : null} />

      {event && <Flag event={event} />}
    </main>
  );
}

/** A notification in the corner saying what just happened, like a tracker's flag. */
function Flag({ event }: { event: BoardEvent }) {
  const t = TICKETS.find((x) => x.id === event.ticketId)!;
  const who = event.line ? event.line.who : "ci";
  return (
    <div
      key={event.seq}
      role="status"
      className="flag-in fixed bottom-4 left-4 right-4 z-40 flex max-w-md gap-3 rounded-[3px] bg-card p-3 shadow-raised sm:right-auto lg:left-64"
    >
      <Avatar id={who} size={28} />
      <div className="min-w-0 text-sm">
        <div className="font-semibold text-ink">
          {t.key} · {event.moved ? `moved to ${STATIONS[event.after.station].name}` : ACTORS[who].name}
        </div>
        <p className="line-clamp-2 text-dim">
          {event.moved
            ? `${STATIONS[event.after.station].tagline}. ${event.tests.length ? `${event.tests.length} test ${event.tests.length === 1 ? "kind" : "kinds"} changed.` : ""}`
            : event.line?.text}
        </p>
      </div>
    </div>
  );
}

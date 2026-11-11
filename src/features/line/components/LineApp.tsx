"use client";

import { useCallback, useEffect, useState } from "react";
import {
  describeChange,
  isFinished,
  jumpTo,
  jumpToStation,
  lastStep,
  START,
  stationOf,
  stepOne,
  type BoardEvent,
  type Cursor,
} from "../logic";
import { ACTORS, STATIONS } from "../stations";
import { TICKETS } from "../tickets";
import { TOUR, TOUR_STOP_MS } from "../tour";
import { Board } from "./Board";
import { IssuePanel } from "./IssuePanel";
import { Avatar } from "./jira";

const SPEEDS = [1, 2, 4] as const;
type Speed = (typeof SPEEDS)[number];
/** One event on the board every few seconds, so a viewer can follow each change. */
const BEAT_MS = 3200;

type Mode = "tour" | "run" | "idle";

function startCursors(): Record<string, Cursor> {
  return Object.fromEntries(TICKETS.map((t) => [t.id, START]));
}

export function LineApp({ initialTicketId, initialStep }: { initialTicketId: string; initialStep: number | null }) {
  const [selectedId, setSelectedId] = useState(initialTicketId);
  const [cursors, setCursors] = useState<Record<string, Cursor>>(() => {
    const c = startCursors();
    if (initialStep !== null) {
      const t = TICKETS.find((x) => x.id === initialTicketId)!;
      c[t.id] = jumpTo(t, initialStep);
    } else {
      c[TOUR[0].ticketId] = TOUR[0].cursor;
    }
    return c;
  });
  const [mode, setMode] = useState<Mode>(initialStep === null ? "tour" : "idle");
  const [tourIndex, setTourIndex] = useState(0);
  const [tourPlaying, setTourPlaying] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [follow, setFollow] = useState(true);
  const [speed, setSpeed] = useState<Speed>(1);
  const [turn, setTurn] = useState(0);
  const [event, setEvent] = useState<BoardEvent | null>(null);

  const ticket = TICKETS.find((t) => t.id === selectedId) ?? TICKETS[0];
  const cursor = cursors[ticket.id] ?? START;
  const allDone = TICKETS.every((t) => isFinished(t, cursors[t.id] ?? START));

  // Put the board at a tour stop: that ticket jumps to the moment, and what changed is highlighted.
  const showStop = useCallback(
    (i: number) => {
      const stop = TOUR[i];
      const t = TICKETS.find((x) => x.id === stop.ticketId)!;
      setCursors((c) => {
        const before = c[t.id] ?? START;
        setEvent((e) => describeChange(t, before, stop.cursor, (e?.seq ?? 0) + 1));
        return { ...c, [t.id]: stop.cursor };
      });
      setSelectedId(t.id);
      setTourIndex(i);
    },
    [],
  );

  // The tour moves on by itself unless paused.
  useEffect(() => {
    if (mode !== "tour" || !tourPlaying) return;
    const timer = window.setTimeout(() => {
      if (tourIndex + 1 < TOUR.length) showStop(tourIndex + 1);
      else setTourPlaying(false);
    }, TOUR_STOP_MS);
    return () => window.clearTimeout(timer);
  }, [mode, tourPlaying, tourIndex, showStop]);

  // Run all: each beat one ticket takes one step; with Follow on, the view moves to it.
  useEffect(() => {
    if (mode !== "run" || !playing) return;
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
      BEAT_MS / speed,
    );
    return () => window.clearTimeout(timer);
  }, [mode, playing, cursors, turn, speed, follow, event]);

  // The address bar carries the selected ticket and its step.
  useEffect(() => {
    window.history.replaceState(window.history.state, "", `?t=${ticket.id}&s=${cursor.step + 1}`);
  }, [ticket.id, cursor.step]);

  const startTour = () => {
    setPlaying(false);
    setMode("tour");
    setTourPlaying(true);
    setCursors(startCursors());
    showStop(0);
  };

  const runAll = () => {
    if (mode !== "run" || allDone) {
      setCursors(startCursors());
      setTurn(0);
      setEvent(null);
      setMode("run");
      setPlaying(true);
      setFollow(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setFollow(false);
  }, []);

  /** From the status menu: move the selected ticket to its first visit of a column. */
  const jumpStation = useCallback(
    (station: number) => {
      const c = jumpToStation(ticket, station);
      if (!c) return;
      setPlaying(false);
      setMode("idle");
      setEvent(null);
      setCursors((all) => ({ ...all, [ticket.id]: c }));
    },
    [ticket],
  );

  const stepBy = useCallback(
    (delta: number) => {
      if (mode === "tour") {
        const i = Math.max(0, Math.min(TOUR.length - 1, tourIndex + delta));
        setTourPlaying(false);
        showStop(i);
        return;
      }
      setPlaying(false);
      setEvent(null);
      setCursors((all) => ({ ...all, [ticket.id]: jumpTo(ticket, Math.max(0, Math.min(lastStep(ticket), cursor.step + delta))) }));
    },
    [mode, tourIndex, showStop, ticket, cursor.step],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(target.tagName)) return;
      if (e.key === "ArrowRight") stepBy(1);
      else if (e.key === "ArrowLeft") stepBy(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stepBy]);

  const station = STATIONS[stationOf(ticket, cursor)];
  const stop = TOUR[tourIndex];

  return (
    <main className="flex flex-col gap-3 px-4 pb-24 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-dim">
        Projects <span className="text-faint">/</span> Bookwell
      </nav>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-medium text-ink">Delivery board</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-dim">
            Agents write the code. Tests written first, a second model, and gates nobody can talk past decide what ships.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "run" && (
            <>
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
            </>
          )}
          {mode !== "tour" && (
            <button
              type="button"
              onClick={startTour}
              className="h-8 rounded-[3px] bg-neutral-bg px-3 text-sm font-medium text-ink hover:bg-hover"
            >
              Take the tour
            </button>
          )}
          <button
            type="button"
            onClick={runAll}
            className={`h-8 min-w-28 rounded-[3px] px-3 text-sm font-medium ${
              mode === "tour" ? "bg-neutral-bg text-ink hover:bg-hover" : "bg-brand text-white hover:bg-brand-hover"
            }`}
          >
            {mode === "run" && playing ? "Pause" : mode === "run" && !allDone ? "Resume" : "Run all tickets"}
          </button>
        </div>
      </div>

      {mode === "tour" && (
        <TourCallout
          index={tourIndex}
          playing={tourPlaying}
          onBack={() => stepBy(-1)}
          onNext={() => (tourIndex + 1 < TOUR.length ? stepBy(1) : setMode("idle"))}
          onToggle={() => setTourPlaying((p) => !p)}
          onExit={() => setMode("idle")}
          title={stop.title}
          body={stop.body}
          ticketKey={TICKETS.find((t) => t.id === stop.ticketId)!.key}
        />
      )}

      <Board tickets={TICKETS} cursors={cursors} selectedId={ticket.id} onSelect={select} event={event} />

      <p key={station.id} className="flash rounded-[3px] border-l-4 border-brand bg-panel-2 px-3 py-2 text-sm text-ink">
        <span className="font-semibold">
          {station.lane} · {station.name}:
        </span>{" "}
        <span className="text-dim">{station.brief}</span>
      </p>

      <IssuePanel ticket={ticket} cursor={cursor} onJump={jumpStation} event={event?.ticketId === ticket.id ? event : null} />

      {mode === "run" && event && <Flag event={event} />}
    </main>
  );
}

function TourCallout({
  index,
  playing,
  onBack,
  onNext,
  onToggle,
  onExit,
  title,
  body,
  ticketKey,
}: {
  index: number;
  playing: boolean;
  onBack: () => void;
  onNext: () => void;
  onToggle: () => void;
  onExit: () => void;
  title: string;
  body: string;
  ticketKey: string;
}) {
  const last = index === TOUR.length - 1;
  return (
    <section
      aria-label="Guided tour"
      className="flex flex-col gap-2 rounded-[3px] bg-purple-bg p-3 shadow-card sm:flex-row sm:items-center sm:gap-4"
    >
      <div key={index} className="flag-in min-w-0 flex-1">
        <div className="text-xs font-bold uppercase text-purple">
          Tour · {index + 1} of {TOUR.length} · {ticketKey}
        </div>
        <div className="font-semibold text-ink">{title}</div>
        <p className="text-sm text-dim">{body}</p>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <div className="flex gap-1" aria-hidden>
          {TOUR.map((_, i) => (
            <span key={i} className={`h-1.5 w-4 rounded-full ${i <= index ? "bg-purple" : "bg-edge"}`} />
          ))}
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={onExit} className="h-8 rounded-[3px] px-2 text-sm text-dim hover:bg-hover">
            Exit tour
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={index === 0}
            className="h-8 rounded-[3px] bg-card px-3 text-sm text-ink shadow-card disabled:opacity-40"
          >
            Back
          </button>
          <button type="button" onClick={onToggle} className="h-8 rounded-[3px] bg-card px-3 text-sm text-ink shadow-card">
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="h-8 rounded-[3px] bg-purple px-3 text-sm font-medium text-white hover:opacity-90"
          >
            {last ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}

/** A notification in the corner saying what just happened, like a tracker's flag. */
function Flag({ event }: { event: BoardEvent }) {
  const t = TICKETS.find((x) => x.id === event.ticketId)!;
  const who = event.line ? event.line.who : "ci";
  const to = STATIONS[stationOf(t, event.after)];
  return (
    <div
      key={event.seq}
      role="status"
      className="flag-in fixed bottom-4 left-4 right-4 z-40 flex max-w-md gap-3 rounded-[3px] bg-card p-3 shadow-raised sm:right-auto lg:left-20 2xl:left-64"
    >
      <Avatar id={who} size={28} />
      <div className="min-w-0 text-sm">
        <div className="font-semibold text-ink">
          {t.key} · {event.movedBack ? `sent back to ${to.name}` : event.moved ? `moved to ${to.name}` : ACTORS[who].name}
        </div>
        <p className="line-clamp-2 text-dim">{event.moved ? to.brief : event.line?.text}</p>
      </div>
    </div>
  );
}

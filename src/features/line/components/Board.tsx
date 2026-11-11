"use client";

import { useEffect, useRef } from "react";
import { assigneeAt, isStepDone, stationOf, testState, type BoardEvent, type Cursor } from "../logic";
import { STATIONS, TEST_KINDS } from "../stations";
import type { Ticket } from "../types";
import { Avatar, IssueTypeIcon, PriorityIcon } from "./jira";

const LANE_START = new Set(STATIONS.map((s, i) => (i === 0 || STATIONS[i - 1].lane !== s.lane ? i : -1)));

/**
 * The delivery board: one column per station, each ticket a card sitting in
 * the column it has reached. Cards move as the run plays.
 */
export function Board({
  tickets,
  cursors,
  selectedId,
  onSelect,
  event,
}: {
  tickets: Ticket[];
  cursors: Record<string, Cursor>;
  selectedId: string;
  onSelect: (id: string) => void;
  event: BoardEvent | null;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const eventTicket = event ? tickets.find((t) => t.id === event.ticketId) : undefined;
  const selectedTicket = tickets.find((t) => t.id === selectedId);
  const selectedStation = selectedTicket ? stationOf(selectedTicket, cursors[selectedId] ?? { step: 0, shown: 0 }) : 0;

  // Keep the selected card's column in view when the board scrolls sideways.
  useEffect(() => {
    const el = scroller.current;
    const col = el?.querySelector<HTMLElement>(`[data-col="${selectedStation}"]`);
    if (!el || !col) return;
    const left = col.offsetLeft - el.offsetLeft;
    if (left < el.scrollLeft || left + col.offsetWidth > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: Math.max(0, left - 24), behavior: "smooth" });
    }
  }, [selectedStation]);

  return (
    <div ref={scroller} className="hidden overflow-x-auto pb-3 lg:block">
      <div className="flex min-w-[1180px] gap-1.5">
        {STATIONS.map((station, i) => {
          const here = tickets.filter((t) => stationOf(t, cursors[t.id] ?? { step: 0, shown: 0 }) === i);
          return (
            <section
              key={station.id}
              data-col={i}
              aria-label={`${station.name}, ${here.length} ${here.length === 1 ? "ticket" : "tickets"}`}
              className={`relative flex min-w-[110px] flex-1 flex-col rounded-md bg-column ${LANE_START.has(i) && i > 0 ? "ml-1.5" : ""}`}
            >
              {event?.moved && eventTicket && stationOf(eventTicket, event.after) === i && (
                <span key={event.seq} aria-hidden className="flash-ring pointer-events-none absolute inset-0 rounded-md" />
              )}
              <header className="px-2 pb-1 pt-2.5" title={`Stops the line: ${station.gate}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-faint">{station.lane}</div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-dim">
                  <span className="truncate">{station.name}</span>
                  <span className="font-normal text-faint">{here.length || ""}</span>
                </div>
              </header>
              <div className="flex min-h-[280px] flex-col gap-1.5 p-1.5">
                {here.map((t) => (
                  <Card
                    key={`${t.id}-${i}`}
                    ticket={t}
                    cursor={cursors[t.id]}
                    selected={t.id === selectedId}
                    onSelect={onSelect}
                    flashKey={event?.ticketId === t.id ? event.seq : null}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  ticket,
  cursor,
  selected,
  onSelect,
  flashKey,
}: {
  ticket: Ticket;
  cursor: Cursor;
  selected: boolean;
  onSelect: (id: string) => void;
  /** Set when this card just changed: a ring fades out around it. */
  flashKey: number | null;
}) {
  const step = ticket.steps[cursor.step];
  const done = isStepDone(ticket, cursor);
  // This step is a move backwards: a gate or a rollback sent the ticket back.
  const sentBack = cursor.step > 0 && STATIONS.findIndex((x) => x.id === step.station) < STATIONS.findIndex((x) => x.id === ticket.steps[cursor.step - 1].station);
  const progress = step.log.length ? cursor.shown / step.log.length : 1;
  const tally = (state: "red" | "green") =>
    TEST_KINDS.filter((k) => testState(ticket, k.id, cursor) === state).reduce((n, k) => n + (ticket.tests[k.id]?.count ?? 0), 0);
  const failing = tally("red");
  const passing = tally("green");

  return (
    <button
      type="button"
      onClick={() => onSelect(ticket.id)}
      aria-pressed={selected}
      className={`card-in relative flex flex-col gap-2 rounded-[3px] p-2.5 text-left shadow-card transition-colors ${
        selected ? "bg-selected outline-2 outline-brand" : "bg-card hover:bg-panel-2"
      }`}
    >
      {flashKey !== null && (
        <span key={flashKey} aria-hidden className="flash-ring pointer-events-none absolute inset-0 rounded-[3px]" />
      )}
      <span className="line-clamp-3 text-[13px] leading-snug text-ink">{ticket.title}</span>
      <span className="flex flex-wrap gap-1">
        {sentBack && (
          <span className="rounded-[3px] bg-warn-bg px-1 text-[11px] font-semibold uppercase text-warn">Sent back</span>
        )}
        {step.mode !== "full" && (
          <span className="rounded-[3px] bg-neutral-bg px-1 text-[11px] font-semibold uppercase text-dim">{step.mode}</span>
        )}
        {failing > 0 && (
          <span className="rounded-[3px] bg-fail-bg px-1 text-[11px] font-semibold text-fail-text">{failing} failing</span>
        )}
        {passing > 0 && (
          <span className="rounded-[3px] bg-pass-bg px-1 text-[11px] font-semibold text-pass-text">{passing} passing</span>
        )}
      </span>
      <span className="flex items-center gap-1.5">
        <IssueTypeIcon kind={ticket.kind} />
        <span className="whitespace-nowrap text-[11px] font-semibold text-dim">{ticket.key}</span>
        <span className="hidden 2xl:inline">
          <PriorityIcon priority={ticket.priority} />
        </span>
        <span className="ml-auto">
          <Avatar id={assigneeAt(ticket, cursor)} size={22} />
        </span>
      </span>
      {!done && (
        <span className="h-1 overflow-hidden rounded-full bg-neutral-bg" aria-hidden>
          <span className="block h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
        </span>
      )}
    </button>
  );
}

/**
 * The board on a phone: ten columns side by side do not fit, so each station
 * is a row and the tickets in it are chips. All four tickets and every
 * station stay on one screen.
 */
export function PhoneBoard({
  tickets,
  cursors,
  selectedId,
  onSelect,
  event,
}: {
  tickets: Ticket[];
  cursors: Record<string, Cursor>;
  selectedId: string;
  onSelect: (id: string) => void;
  event: BoardEvent | null;
}) {
  const at = (t: Ticket) => stationOf(t, cursors[t.id] ?? { step: 0, shown: 0 });
  const eventTicket = event ? tickets.find((t) => t.id === event.ticketId) : undefined;
  return (
    <ol className="flex flex-col overflow-hidden rounded-md bg-column lg:hidden" aria-label="Delivery board">
      {STATIONS.map((station, i) => {
        const here = tickets.filter((t) => at(t) === i);
        const hasSelected = here.some((t) => t.id === selectedId);
        const moved = event?.moved && eventTicket && stationOf(eventTicket, event.after) === i;
        return (
          <li
            key={`${station.id}-${moved ? event!.seq : "still"}`}
            className={`flex min-h-10 items-center gap-2 border-b border-edge px-2 py-1.5 last:border-b-0 ${
              hasSelected ? "border-l-4 border-l-brand bg-selected" : "border-l-4 border-l-transparent"
            } ${moved ? "flash" : ""}`}
          >
            <div className="w-24 shrink-0">
              <div className="text-[10px] font-semibold uppercase leading-tight text-faint">{station.lane}</div>
              <div className={`text-xs font-semibold leading-tight ${here.length ? "text-ink" : "text-faint"}`}>{station.name}</div>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {here.map((t) => {
                const c = cursors[t.id] ?? { step: 0, shown: 0 };
                const failing = TEST_KINDS.filter((k) => testState(t, k.id, c) === "red").length > 0;
                const selected = t.id === selectedId;
                const changed = event?.ticketId === t.id;
                return (
                  <button
                    key={`${t.id}-${changed ? event!.seq : "still"}`}
                    type="button"
                    onClick={() => onSelect(t.id)}
                    aria-pressed={selected}
                    className={`flex h-8 items-center gap-1.5 rounded-[3px] px-2 text-xs font-semibold shadow-card ${
                      selected ? "bg-brand text-white" : "bg-card text-ink"
                    } ${changed ? "flash-ring" : ""}`}
                  >
                    <IssueTypeIcon kind={t.kind} className="h-3.5 w-3.5" />
                    {t.key}
                    {failing && <span aria-label="tests failing" className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-white" : "bg-fail"}`} />}
                    <Avatar id={assigneeAt(t, c)} size={18} />
                  </button>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

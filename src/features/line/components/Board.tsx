"use client";

import { useEffect, useRef } from "react";
import { assigneeAt, isStepDone, lastStep, stationOf, testTally, type BoardEvent, type Cursor } from "../logic";
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
                <div className="text-3xs font-semibold uppercase tracking-wide text-faint">{station.lane}</div>
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
  const tallies = TEST_KINDS.map((k) => testTally(ticket, k.id, cursor));
  const failing = tallies.reduce((n, t) => n + t.failing, 0);
  const passing = tallies.reduce((n, t) => n + t.passing, 0);

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
      <span className="line-clamp-3 text-[0.929rem] leading-snug text-ink">{ticket.title}</span>
      <span className="flex flex-wrap gap-1">
        {sentBack && (
          <span className="rounded-[3px] bg-warn-bg px-1 text-2xs font-semibold uppercase text-warn">Sent back</span>
        )}
        {step.mode !== "full" && (
          <span className="rounded-[3px] bg-neutral-bg px-1 text-2xs font-semibold uppercase text-dim">{step.mode}</span>
        )}
        {failing > 0 && (
          <span className="rounded-[3px] bg-fail-bg px-1 text-2xs font-semibold text-fail-text">{failing} failing</span>
        )}
        {passing > 0 && (
          <span className="rounded-[3px] bg-pass-bg px-1 text-2xs font-semibold text-pass-text">{passing} passing</span>
        )}
      </span>
      <span className="flex items-center gap-1.5">
        <IssueTypeIcon kind={ticket.kind} />
        <span className="whitespace-nowrap text-2xs font-semibold text-dim">{ticket.key}</span>
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
 * The board on a phone. Ten columns do not fit and ten rows would mostly be
 * empty, so the board is turned on its side: each ticket is a card, and the
 * ten stations are the track inside it. The selected card opens up to say
 * where it is and lead to its details; tapping another card selects it.
 */
export function PhoneBoard({
  tickets,
  cursors,
  selectedId,
  onSelect,
  onOpen,
  event,
}: {
  tickets: Ticket[];
  cursors: Record<string, Cursor>;
  selectedId: string;
  onSelect: (id: string) => void;
  /** The selected card was tapped again: go to its details. */
  onOpen: () => void;
  event: BoardEvent | null;
}) {
  return (
    <ol className="flex flex-col gap-2 lg:hidden" aria-label="Delivery board">
      {tickets.map((t) => {
        const c = cursors[t.id] ?? { step: 0, shown: 0 };
        const at = stationOf(t, c);
        const station = STATIONS[at];
        const selected = t.id === selectedId;
        const changed = event?.ticketId === t.id;
        const finished = isStepDone(t, c) && c.step === lastStep(t);
        const sentBack = c.step > 0 && at < STATIONS.findIndex((x) => x.id === t.steps[c.step - 1].station);
        const failing = TEST_KINDS.reduce((n, k) => n + testTally(t, k.id, c).failing, 0);
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => (selected ? onOpen() : onSelect(t.id))}
              aria-pressed={selected}
              className={`relative flex w-full flex-col gap-2 rounded-lg p-3 text-left shadow-card transition-colors ${
                selected ? "bg-selected outline-2 outline-brand" : "bg-card"
              }`}
            >
              {changed && <span key={event!.seq} aria-hidden className="flash-ring pointer-events-none absolute inset-0 rounded-lg" />}
              <span className="flex items-center gap-2">
                <IssueTypeIcon kind={t.kind} />
                <span className="text-sm font-semibold text-dim">{t.key}</span>
                {finished && <span className="rounded-[3px] bg-pass-bg px-1.5 text-xs font-semibold uppercase text-pass-text">Done</span>}
                {sentBack && <span className="rounded-[3px] bg-warn-bg px-1.5 text-xs font-semibold uppercase text-warn">Sent back</span>}
                {failing > 0 && <span className="rounded-[3px] bg-fail-bg px-1.5 text-xs font-semibold text-fail-text">{failing} failing</span>}
                {!selected && <span className="ml-auto truncate text-xs text-dim">{station.name}</span>}
                <span className={selected ? "ml-auto" : ""}>
                  <Avatar id={assigneeAt(t, c)} size={24} />
                </span>
              </span>
              <span className={`text-ink ${selected ? "text-base font-medium leading-snug" : "truncate text-sm"}`}>{t.title}</span>
              <StationTrack at={at} finished={finished} sentBack={sentBack} />
              {selected && (
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-dim">
                      {at + 1} of {STATIONS.length} · {station.lane} ·{" "}
                    </span>
                    <span className="font-semibold text-ink">{station.name}</span>
                  </span>
                  <span className="shrink-0 font-medium text-brand">
                    Details <span aria-hidden>↓</span>
                  </span>
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Ten stations as a bar of segments, with a gap between lanes: passed, here, still to come. */
function StationTrack({ at, finished, sentBack }: { at: number; finished: boolean; sentBack: boolean }) {
  return (
    <span className="flex h-2 items-center gap-0.5" role="img" aria-label={`Station ${at + 1} of ${STATIONS.length}: ${STATIONS[at].name}`}>
      {STATIONS.map((s, i) => (
        <span
          key={s.id}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${LANE_START.has(i) && i > 0 ? "ml-1.5" : ""} ${
            finished ? "bg-pass" : i < at ? "bg-brand/45" : i === at ? `h-2 ${sentBack ? "bg-warn" : "bg-brand"}` : "bg-edge-2/45"
          }`}
        />
      ))}
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  assigneeAt,
  formatMinutes,
  formatUsd,
  isStepDone,
  lastStep,
  stationIndex,
  stationOf,
  stepAt,
  testState,
  totalsAt,
  totalsFor,
  type BoardEvent,
  type Cursor,
  type TestState,
} from "../logic";
import { ACTORS, STATIONS, TEST_KINDS } from "../stations";
import type { ActorId, Ticket, Tone } from "../types";
import { Avatar, IssueTypeIcon, Lozenge, PriorityIcon, type LozengeTone } from "./jira";

const TEST_LOZENGE: Record<Exclude<TestState, "na">, { tone: LozengeTone; label: string }> = {
  none: { tone: "neutral", label: "To do" },
  red: { tone: "danger", label: "Failing" },
  green: { tone: "success", label: "Passing" },
};

const TONE_LOZENGE: Partial<Record<Tone, { tone: LozengeTone; label: string }>> = {
  pass: { tone: "success", label: "pass" },
  fail: { tone: "danger", label: "fail" },
  warn: { tone: "warning", label: "flag" },
};

/** The issue view for the selected ticket: status, details, tests and activity. */
export function IssuePanel({
  ticket,
  cursor,
  onJump,
  event,
}: {
  ticket: Ticket;
  cursor: Cursor;
  onJump: (station: number) => void;
  /** The change that just happened to this ticket, if any: what it touched is highlighted. */
  event: BoardEvent | null;
}) {
  const seq = event?.seq ?? 0;
  /** A yellow wash on an element that just changed; the key restarts it on every event. */
  const hlKey = (field: string, changed: boolean | undefined) => (event && changed ? `${field}-${seq}` : field);
  const hlClass = (changed: boolean | undefined) => (event && changed ? "flash rounded-[3px]" : "");
  const stationNow = stationOf(ticket, cursor);
  const station = STATIONS[stationNow];
  const done = isStepDone(ticket, cursor);
  const now = totalsAt(ticket, cursor);
  const all = totalsFor(ticket);
  const finished = done && cursor.step === lastStep(ticket);

  const tests = TEST_KINDS.map((k) => ({ k, state: testState(ticket, k.id, cursor), t: ticket.tests[k.id] })).filter(
    (r) => r.state !== "na",
  );
  const count = (s: TestState) => tests.filter((r) => r.state === s).reduce((n, r) => n + (r.t?.count ?? 0), 0);
  const total = tests.reduce((n, r) => n + (r.t?.count ?? 0), 0);
  const [green, red] = [count("green"), count("red")];

  const details = (
    <dl className="grid grid-cols-[110px_minmax(0,1fr)] content-start gap-x-3 gap-y-2.5 rounded-md border border-edge p-3 text-sm">
      <dt className="col-span-2 -mx-3 -mt-3 mb-1 border-b border-edge px-3 py-2 font-semibold">Details</dt>
      <dt className="text-dim">Assignee</dt>
      <dd key={hlKey("assignee", event?.assigneeChanged)} className={hlClass(event?.assigneeChanged)}>
        <span className="flex items-center gap-2">
        <Avatar id={assigneeAt(ticket, cursor)} />
        <span className="truncate">{ACTORS[assigneeAt(ticket, cursor)].name}</span>
        </span>
      </dd>
      <dt className="text-dim">Reporter</dt>
      <dd>{ticket.source}</dd>
      <dt className="text-dim">Priority</dt>
      <dd className="flex items-center gap-1.5">
        <PriorityIcon priority={ticket.priority} />
        {ticket.priority === "P1" ? "Highest" : "High"}
      </dd>
      <dt className="text-dim">Environment</dt>
      <dd key={hlKey("environment", event?.moved)} className={hlClass(event?.moved)}>{station.environment}</dd>
      <dt className="text-dim">Time tracking</dt>
      <dd key={hlKey("time", true)} className={hlClass(true)}>
        <span className="flex flex-col gap-1">
        <span className="h-1.5 overflow-hidden rounded-full bg-neutral-bg">
          <span
            className="block h-full bg-brand transition-[width] duration-500"
            style={{ width: `${(now.wallMinutes / all.wallMinutes) * 100}%` }}
          />
        </span>
        <span className="text-xs text-faint">
          {formatMinutes(now.wallMinutes)} logged · people {formatMinutes(now.humanMinutes)}
        </span>
        </span>
      </dd>
      <dt className="text-dim">Model spend</dt>
      <dd key={hlKey("spend", true)} className={hlClass(true)}>
        {formatUsd(now.aiUsd)} <span className="text-xs text-faint">of {formatUsd(all.aiUsd)}</span>
      </dd>
    </dl>
  );

  return (
    <article className="grid gap-6 rounded-md border border-edge bg-panel p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center gap-2 text-sm text-dim">
        <IssueTypeIcon kind={ticket.kind} />
        <span>Bookwell</span>
        <span className="text-faint">/</span>
        <span className="font-medium">{ticket.key}</span>
      </div>

      <h2 className="text-xl font-medium leading-snug text-ink sm:text-2xl">{ticket.title}</h2>

      <div className="flex flex-wrap items-center gap-2">
        <span className="relative">
          <StatusMenu current={stationNow} visited={new Set(ticket.steps.slice(0, cursor.step + 1).map((s) => stationIndex(s.station)))} finished={finished} onJump={onJump} />
          {event?.moved && (
            <span key={seq} aria-hidden className="flash-ring pointer-events-none absolute inset-0 rounded-[3px]" />
          )}
        </span>
        <span className="text-xs text-faint">Exit: {station.gate}</span>
      </div>

      <div className="xl:hidden">{details}</div>

      <Activity ticket={ticket} cursor={cursor} seq={event ? seq : null} />

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Tests</h3>
          <span className="text-xs text-faint">
            {green} of {total} passing
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-neutral-bg" aria-hidden>
          <span className="bg-pass transition-[width] duration-500" style={{ width: `${(green / total) * 100}%` }} />
          <span className="bg-fail transition-[width] duration-500" style={{ width: `${(red / total) * 100}%` }} />
        </div>
        <ul className="grid overflow-hidden rounded-md border border-edge sm:grid-cols-2 [&>li]:border-b [&>li]:border-edge sm:[&>li:nth-child(odd)]:border-r">
          {tests.map(({ k, state, t }) => {
            const l = TEST_LOZENGE[state as Exclude<TestState, "na">];
            return (
              <li
                key={event?.tests.includes(k.id) ? `${k.id}-${seq}` : k.id}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm ${event?.tests.includes(k.id) ? "flash" : ""}`}
                title={k.proves}
              >
                <span className="min-w-0 flex-1 truncate">{k.name}</span>
                <span className="text-xs text-faint">
                  {t?.count} {t?.unit}
                </span>
                <span className="w-16 text-right">
                  <Lozenge tone={l.tone}>{l.label}</Lozenge>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      </div>
      <div className="hidden xl:block">{details}</div>
    </article>
  );
}

function StatusMenu({
  current,
  visited,
  finished,
  onJump,
}: {
  current: number;
  visited: Set<number>;
  finished: boolean;
  onJump: (s: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-8 items-center gap-1.5 rounded-[3px] px-3 text-sm font-semibold ${
          finished ? "bg-pass-bg text-pass-text" : "bg-brand text-white hover:bg-brand-hover"
        }`}
      >
        {finished ? "Done" : STATIONS[current].name}
        <span aria-hidden className="text-[10px]">▼</span>
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 top-9 z-20 w-56 rounded-[3px] bg-card py-1 shadow-raised">
          {STATIONS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === current}
                onClick={() => {
                  onJump(i);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-hover ${
                  i === current ? "border-l-2 border-brand bg-selected" : "border-l-2 border-transparent"
                }`}
              >
                <Lozenge tone={i === current ? "info" : visited.has(i) ? "success" : "neutral"}>{s.name}</Lozenge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Entry {
  key: string;
  who: ActorId;
  /** For a status change: the columns it moved between. */
  from?: number;
  to?: number;
  kind: "status" | "comment";
  text: string;
  tone?: Tone;
}

/** Status changes and comments, newest first, as they happen. */
function Activity({ ticket, cursor, seq }: { ticket: Ticket; cursor: Cursor; seq: number | null }) {
  const entries: Entry[] = [];
  for (let i = 0; i <= cursor.step; i++) {
    const step = stepAt(ticket, i);
    if (i > 0) {
      const from = stationIndex(ticket.steps[i - 1].station);
      const to = stationIndex(step.station);
      entries.push({ key: `s${i}`, who: "ci", from, to, kind: "status", text: "" });
    }
    const lines = i < cursor.step ? step.log : step.log.slice(0, cursor.shown);
    lines.forEach((l, j) => entries.push({ key: `${i}-${j}`, who: l.who, kind: "comment", text: l.text, tone: l.tone }));
  }
  entries.reverse();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold">Activity</h3>
        <span className="rounded-[3px] bg-selected px-2 py-0.5 text-xs font-medium text-brand">All</span>
      </div>
      <ol className="flex max-h-[300px] flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
        {entries.map((e, idx) =>
          e.kind === "status" ? (
            <li
              key={`${ticket.id}-${e.key}${idx === 0 && seq !== null ? `-${seq}` : ""}`}
              className={`flex items-center gap-2 rounded px-1 py-0.5 text-xs text-dim ${idx === 0 && seq !== null ? "flash" : ""}`}
            >
              <Avatar id="ci" size={20} />
              <span>{e.to! < e.from! ? "Automation sent it back" : "Automation moved it"}</span>
              <Lozenge tone="neutral">{STATIONS[e.from!].name}</Lozenge>
              <span aria-hidden>→</span>
              <Lozenge tone={e.to! < e.from! ? "warning" : "info"}>{STATIONS[e.to!].name}</Lozenge>
            </li>
          ) : (
            <li
              key={`${ticket.id}-${e.key}${idx === 0 && seq !== null ? `-${seq}` : ""}`}
              className={`flex gap-2 rounded px-1 py-0.5 ${idx === 0 && seq !== null ? "flash" : ""}`}
            >
              <Avatar id={e.who} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-xs">
                  <span className="font-semibold text-ink">{ACTORS[e.who].name}</span>
                  {ACTORS[e.who].tier && <span className="text-faint">{ACTORS[e.who].tier} model</span>}
                  {e.tone && TONE_LOZENGE[e.tone] && <Lozenge tone={TONE_LOZENGE[e.tone]!.tone}>{TONE_LOZENGE[e.tone]!.label}</Lozenge>}
                </div>
                <p className="text-sm text-ink">{e.text}</p>
              </div>
            </li>
          ),
        )}
        {entries.length === 0 && <li className="text-sm text-faint">Nothing yet.</li>}
      </ol>
    </section>
  );
}

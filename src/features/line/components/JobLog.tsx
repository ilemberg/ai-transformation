"use client";

import { useEffect, useRef } from "react";
import { isStationDone, stationAt, stepAt, type Cursor } from "../logic";
import { ACTORS } from "../stations";
import type { Ticket } from "../types";
import { LineIcon, StatusIcon } from "./icons";
import { actorDot } from "./ui";

/** The selected job's log, one step per line, like a CI job page. */
export function JobLog({ ticket, cursor }: { ticket: Ticket; cursor: Cursor }) {
  const station = stationAt(cursor.station);
  const step = stepAt(ticket, cursor.station);
  const lines = step.log.slice(0, cursor.shown);
  const done = isStationDone(ticket, cursor);
  const box = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [cursor.shown]);

  return (
    <section className="overflow-hidden rounded-md border border-edge">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge bg-panel-2 px-4 py-3">
        <StatusIcon status={done ? "success" : "running"} />
        <h2 className="text-base font-semibold">{station.name}</h2>
        <span className="text-sm text-dim">{station.tagline}</span>
        <span className="ml-auto rounded-full border border-edge px-2 font-mono text-xs text-dim">{station.environment}</span>
      </header>
      <ol ref={box} className="max-h-[300px] min-h-[180px] overflow-y-auto bg-log py-2 font-mono text-[13px]" aria-live="polite">
        {lines.map((line, j) => (
          <li key={`${cursor.station}-${j}`} className="feed-line flex items-start gap-3 px-4 py-1 hover:bg-panel-2">
            <span className="w-5 shrink-0 select-none pt-[3px] text-right text-xs text-faint">{j + 1}</span>
            <span className="pt-[3px]">
              <LineIcon tone={line.tone} />
            </span>
            <span className="min-w-0 flex-1">{line.text}</span>
            <span className="hidden shrink-0 items-center gap-1.5 pt-[2px] text-xs text-dim sm:flex">
              <span aria-hidden className={`h-2 w-2 rounded-full ${actorDot(line.who)}`} />
              {ACTORS[line.who].name}
            </span>
          </li>
        ))}
        {!done && (
          <li className="flex items-center gap-3 px-4 py-1 text-faint">
            <span className="w-5" />
            <StatusIcon status="running" className="h-3.5 w-3.5" />
            <span>running…</span>
          </li>
        )}
      </ol>
      <footer className="flex gap-2 border-t border-edge px-4 py-2.5 text-sm">
        <span className="font-semibold text-fail">Stops the line:</span>
        <span className="text-dim">{station.gate}</span>
      </footer>
    </section>
  );
}

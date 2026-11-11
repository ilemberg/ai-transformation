"use client";

import { useEffect, useRef } from "react";
import { stationAt, stepAt, type Cursor } from "../logic";
import { ACTORS } from "../stations";
import type { Ticket } from "../types";
import { actorColor, TONE_MARK } from "./ui";

/** A terminal-style log of everything that has happened to the ticket so far. */
export function Feed({ ticket, cursor }: { ticket: Ticket; cursor: Cursor }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [cursor, ticket.id]);

  const groups = [];
  for (let i = 0; i <= cursor.station; i++) {
    const step = stepAt(ticket, i);
    const lines = i < cursor.station ? step.log : step.log.slice(0, cursor.shown);
    groups.push({ i, step, lines });
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-edge bg-[#070a0e]">
      <div className="flex items-center gap-2 border-b border-edge px-4 py-2.5">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-fail/70" />
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-warn/70" />
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-pass/70" />
        <span className="ml-2 font-mono text-xs text-dim">
          live feed · {ticket.key} · sample run
        </span>
      </div>
      <div
        ref={box}
        className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed"
        style={{ maxHeight: 520 }}
        aria-live="polite"
      >
        {groups.map(({ i, step, lines }) => (
          <div key={i} className={i < cursor.station ? "opacity-55" : ""}>
            <div className="mb-1 mt-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-faint first:mt-0">
              <span>
                ── {String(i + 1).padStart(2, "0")} {stationAt(i).name}
              </span>
              {step.mode !== "full" && <span className="text-warn">[{step.mode}]</span>}
            </div>
            {lines.map((line, j) => {
              const tone = line.tone ? TONE_MARK[line.tone] : null;
              return (
                <div key={j} className="feed-line grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2 py-0.5">
                  <span className={tone ? tone.className : "text-faint"} aria-label={tone?.label}>
                    {tone ? tone.mark : "·"}
                  </span>
                  <span>
                    <span className={`${actorColor(line.who)} font-semibold`}>{ACTORS[line.who].name}</span>
                    <span className="text-faint"> › </span>
                    <span className="text-ink/90">{line.text}</span>
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        {cursor.shown === 0 && cursor.station === 0 && (
          <div className="text-faint">Waiting for the ticket… press Play.</div>
        )}
        <span aria-hidden className="ml-6 inline-block h-3.5 w-2 animate-pulse bg-dim/70 align-middle" />
      </div>
    </div>
  );
}

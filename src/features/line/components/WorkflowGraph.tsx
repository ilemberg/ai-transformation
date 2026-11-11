import { formatMinutes, isStationDone, type Cursor } from "../logic";
import { ACTORS, LANES, STATIONS } from "../stations";
import type { Ticket } from "../types";
import { StatusIcon, type JobStatus } from "./icons";
import { actorDot } from "./ui";

const COLUMNS = LANES.map((lane) => ({
  lane,
  stations: STATIONS.map((s, i) => ({ s, i })).filter(({ s }) => s.lane === lane.id),
}));

function statusOf(i: number, ticket: Ticket, cursor: Cursor): JobStatus {
  if (i < cursor.station) return "success";
  if (i > cursor.station) return "queued";
  return isStationDone(ticket, cursor) ? "success" : "running";
}

/**
 * The run as a job graph: four stages left to right, their jobs stacked,
 * and the bug loop returning from the last stage to the first.
 */
export function WorkflowGraph({
  ticket,
  cursor,
  onPick,
}: {
  ticket: Ticket;
  cursor: Cursor;
  onPick: (station: number) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="grid gap-y-3 lg:grid-cols-[1fr_32px_1fr_32px_1fr_32px_1fr]">
        {COLUMNS.map(({ lane, stations }, c) => (
          <div key={lane.id} className="contents">
            {c > 0 && (
              <div aria-hidden className="flex items-center justify-center text-edge-2">
                <span className="hidden h-px w-full bg-edge-2 lg:block" />
                <span className="lg:hidden">↓</span>
              </div>
            )}
            <div className="flex min-w-0 flex-col">
              <div className="mb-2 text-xs font-semibold text-dim">{lane.id}</div>
              <div className="flex flex-col">
                {stations.map(({ s, i }, k) => {
                  const step = ticket.steps[i];
                  const status = statusOf(i, ticket, cursor);
                  const selected = i === cursor.station;
                  const share = i < cursor.station ? 1 : i === cursor.station ? cursor.shown / Math.max(1, step.log.length) : 0;
                  const models = [...new Set(s.actors.map((a) => ACTORS[a]).filter((a) => a.kind !== "system").map((a) => a.id))];
                  return (
                    <div key={s.id} className="flex flex-col">
                      {k > 0 && <span aria-hidden className="ml-5 h-3 w-px bg-edge-2" />}
                      <button
                        type="button"
                        onClick={() => onPick(i)}
                        aria-current={selected ? "step" : undefined}
                        className={`flex min-h-11 min-w-0 items-center gap-2 rounded-md border bg-panel px-3 py-2 text-left transition-colors ${
                          selected ? "border-accent ring-1 ring-accent" : "border-edge hover:border-edge-2"
                        } ${status === "queued" ? "opacity-70" : ""}`}
                      >
                        <StatusIcon status={status} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.name}</span>
                        {step.mode !== "full" && (
                          <span className="rounded-full border border-edge px-1.5 text-[11px] text-dim">{step.mode}</span>
                        )}
                        <span className="flex gap-0.5" aria-hidden>
                          {models.map((m) => (
                            <span key={m} className={`h-1.5 w-1.5 rounded-full ${actorDot(m)}`} />
                          ))}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-right font-mono text-xs text-dim tabular-nums">
                          {share > 0 ? formatMinutes(step.usage.wallMinutes * share) : ""}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <BugLoop active={cursor.station === STATIONS.length - 1} />
    </div>
  );
}

function BugLoop({ active }: { active: boolean }) {
  return (
    <div className="mt-3 hidden lg:block" aria-hidden>
      <svg viewBox="0 0 1000 28" preserveAspectRatio="none" className="h-7 w-full">
        <path
          d="M 880 0 L 880 20 Q 880 26 874 26 L 126 26 Q 120 26 120 20 L 120 0"
          fill="none"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
          strokeWidth={active ? 2 : 1}
          className={active ? "dash-flow stroke-human" : "stroke-edge-2"}
        />
      </svg>
      <div className={`-mt-5 text-center text-xs ${active ? "text-human" : "text-faint"}`}>
        <span className="bg-panel px-2">bug loop: every incident comes back as a failing test</span>
      </div>
    </div>
  );
}

import { stationAt } from "../logic";
import type { TicketStep } from "../types";
import { ActorChip, Panel, SectionLabel } from "./ui";

export function StationCard({ index, step }: { index: number; step: TicketStep }) {
  const station = stationAt(index);
  return (
    <Panel className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <SectionLabel>
            Station {index + 1} of 10 · {station.lane}
          </SectionLabel>
          <h2 className="text-2xl font-semibold tracking-tight">{station.name}</h2>
          <p className="text-dim">{station.tagline}</p>
        </div>
        <span className="rounded-md border border-edge bg-panel-2 px-2 py-1 font-mono text-[11px] text-dim">
          runs in: <span className="text-ink">{station.environment}</span>
        </span>
      </div>

      {step.mode !== "full" && step.reason && (
        <p className="rounded-lg border border-dashed border-warn/50 bg-warn/5 px-3 py-2 text-sm text-warn">
          <span className="font-semibold uppercase">{step.mode} for this ticket:</span> {step.reason}
        </p>
      )}

      <p className="leading-relaxed">{station.whatWeDo}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-edge bg-panel-2/60 p-3">
          <SectionLabel>Catches</SectionLabel>
          <p className="mt-1 text-sm text-dim">{station.catches}</p>
        </div>
        <div className="rounded-lg border border-fail/30 bg-fail/5 p-3">
          <SectionLabel>Stops the line when</SectionLabel>
          <p className="mt-1 text-sm text-ink/90">{station.gate}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Who works here</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {station.actors.map((a) => (
            <ActorChip key={a} id={a} showRole />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Leaves behind</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {station.outputs.map((o) => (
            <span key={o} className="rounded border border-edge px-2 py-0.5 font-mono text-xs text-dim">
              {o}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

import { Avatar, Lozenge, type LozengeTone } from "@/features/line/components/jira";
import { ACTORS } from "@/features/line/stations";
import type { RunActor } from "../data";

export function actorName(id: RunActor): string {
  return id === "orchestrator" ? "Orchestrator" : ACTORS[id].name;
}

/** The board's avatar, plus a grey one for the orchestrator itself. */
export function ActorAvatar({ id, size = 22 }: { id: RunActor; size?: number }) {
  if (id !== "orchestrator") return <Avatar id={id} size={size} />;
  return (
    <span
      title="Orchestrator"
      className="inline-grid shrink-0 place-items-center rounded-[4px] bg-ink font-semibold text-bg ring-2 ring-card"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      ⧉
    </span>
  );
}

export function ActorChip({ id }: { id: RunActor }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <ActorAvatar id={id} />
      <span className="text-dim">{actorName(id)}</span>
    </span>
  );
}

export function Tone({ tone, children }: { tone: LozengeTone; children: React.ReactNode }) {
  return <Lozenge tone={tone}>{children}</Lozenge>;
}

export function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-6 scroll-mt-20 rounded-md border border-edge bg-panel p-4 shadow-card sm:p-5">
      <h2 id={`${id}-h`} className="text-lg font-semibold">
        {title}
      </h2>
      {lead && <p className="mt-1 max-w-3xl text-sm text-dim">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const BTN = "inline-flex h-8 items-center gap-1.5 rounded-[3px] px-3 text-sm font-medium disabled:opacity-40";

/** Play, Step and Reset for a replay, sized for a thumb. */
export function ReplayControls({
  label,
  playing,
  atEnd,
  atStart,
  onPlay,
  onStep,
  onReset,
}: {
  label: string;
  playing: boolean;
  atEnd: boolean;
  atStart: boolean;
  onPlay: () => void;
  onStep: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Replay controls: ${label}`}>
      <button
        type="button"
        onClick={onPlay}
        aria-label={playing ? `Pause ${label}` : atEnd ? `Replay ${label} from the start` : `Play ${label}`}
        className={`${BTN} bg-brand text-white hover:bg-brand-hover`}
      >
        <span aria-hidden className="w-3 text-center text-xs">
          {playing ? "❚❚" : "▶"}
        </span>
        {playing ? "Pause" : atEnd ? "Replay" : "Play"}
      </button>
      <button
        type="button"
        onClick={onStep}
        disabled={atEnd}
        aria-label={`Step ${label} forward one event`}
        className={`${BTN} bg-neutral-bg text-ink hover:bg-hover`}
      >
        Step <span aria-hidden>›</span>
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={atStart}
        aria-label={`Reset ${label}`}
        className={`${BTN} text-dim hover:bg-hover hover:text-ink`}
      >
        Reset
      </button>
    </div>
  );
}

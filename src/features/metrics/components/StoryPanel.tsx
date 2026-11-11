import { EVENTS, PHASES, type Tone } from "../data";
import { phaseFor } from "../logic";

const TONE: Record<Tone, { dot: string; label: string }> = {
  neutral: { dot: "bg-system", label: "Note" },
  good: { dot: "bg-pass", label: "Good news" },
  bad: { dot: "bg-fail", label: "Trouble" },
};

export function StoryPanel({ month }: { month: number }) {
  const phase = phaseFor(month);
  const seen = [...EVENTS.filter((e) => e.month <= month)].reverse();

  return (
    <section aria-labelledby="story-heading" className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="rounded-xl border border-edge bg-panel p-4 sm:p-5">
        <h2 id="story-heading" className="font-mono text-xs uppercase tracking-widest text-faint">
          Phase {PHASES.indexOf(phase) + 1} of {PHASES.length}
        </h2>
        <p className="mt-1 text-xl font-semibold">
          {phase.name} <span className="text-sm font-normal text-faint">months {phase.start}–{phase.end}</span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-dim">{phase.summary}</p>
        <div className="mt-4 rounded-lg border border-edge-2 bg-panel-2/70 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Exit test</p>
          <p className="mt-1 text-sm">{phase.exitTest}</p>
        </div>
        <ol className="mt-4 flex gap-1.5" aria-label="Phases">
          {PHASES.map((p) => (
            <li
              key={p.id}
              aria-current={p.id === phase.id ? "step" : undefined}
              className={`flex-1 rounded-md border px-2 py-1.5 text-center text-[11px] leading-tight ${
                p.id === phase.id
                  ? "border-speed/60 bg-speed/10 text-ink"
                  : p.end < month
                    ? "border-edge-2 text-dim"
                    : "border-edge text-faint"
              }`}
            >
              {p.name}
              <span className="block font-mono text-[10px] text-faint">
                {p.start}–{p.end}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-edge bg-panel p-4 sm:p-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-faint">What happened, up to month {month}</h3>
        <ol className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
          {seen.map((e) => {
            const now = e.month === month;
            return (
              <li key={`${e.month}-${e.title}`} className={`feed-line flex gap-3 ${now ? "" : "opacity-75"}`}>
                <span className="mt-1.5 flex flex-col items-center">
                  <span className={`h-2.5 w-2.5 rounded-full ${TONE[e.tone].dot}`} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-mono text-xs text-faint">M{e.month}</span>{" "}
                    <span className={`font-medium ${now ? "text-ink" : "text-dim"}`}>{e.title}</span>
                    <span className="sr-only"> ({TONE[e.tone].label})</span>
                    {now && (
                      <span className="ml-2 rounded bg-speed/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-speed">
                        This month
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-dim">{e.note}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

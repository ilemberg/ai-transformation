import { EVENTS, LAST_MONTH, PHASES, type Tone } from "../data";
import { phaseFor, type Verdict } from "../logic";

/** Half the thumb width (larger on a phone), so the bands and ticks line up with the thumb's centre. */
const THUMB_INSET = "mx-3 sm:mx-2";

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-system",
  good: "bg-pass",
  bad: "bg-fail",
};

const pct = (m: number) => `${(m / LAST_MONTH) * 100}%`;

type Props = {
  month: number;
  playing: boolean;
  verdicts: readonly Verdict[];
  onMonthChange: (month: number) => void;
  onTogglePlay: () => void;
};

export function Scrubber({ month, playing, verdicts, onMonthChange, onTogglePlay }: Props) {
  const phase = phaseFor(month);
  const count = (v: Verdict) => verdicts.filter((x) => x === v).length;
  const regressions = count("Regression");
  const watches = count("Watch");

  return (
    <div className="sticky top-12 z-20 -mx-4 border-y border-edge/80 bg-bg/90 px-4 py-2 backdrop-blur sm:top-14 sm:mx-0 sm:rounded-md sm:border sm:px-5 sm:py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMonthChange(month - 1)}
            disabled={month === 0 || playing}
            aria-label="Previous month"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-edge-2 text-dim hover:text-ink disabled:opacity-40 sm:h-9 sm:w-9"
          >
            <span aria-hidden>‹</span>
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? "Pause" : month === LAST_MONTH ? "Replay the year from month 0" : "Play the year month by month"}
            className="flex h-10 items-center gap-2 rounded-lg bg-speed px-3.5 sm:h-9 text-sm font-semibold text-bg hover:bg-speed/90"
          >
            <span aria-hidden className="w-3 text-center">
              {playing ? "❚❚" : "▶"}
            </span>
            {playing ? "Pause" : month === LAST_MONTH ? "Replay" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(month + 1)}
            disabled={month === LAST_MONTH || playing}
            aria-label="Next month"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-edge-2 text-dim hover:text-ink disabled:opacity-40 sm:h-9 sm:w-9"
          >
            <span aria-hidden>›</span>
          </button>
        </div>

        <p className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold tabular-nums">M{month}</span>
          <span className="text-sm text-dim">
            {phase.name} <span className="hidden text-faint sm:inline">· months {phase.start}–{phase.end}</span>
          </span>
        </p>

        <p className="ml-auto hidden items-center gap-3 text-xs sm:flex">
          <span className="text-pass">✓ {count("Healthy")} healthy</span>
          <span className={watches ? "text-warn" : "text-faint"}>! {watches} watch</span>
          <span className={regressions ? "font-semibold text-fail" : "text-faint"}>✕ {regressions} regression</span>
        </p>
      </div>

      <div className="mt-1.5 sm:mt-3">
        <label htmlFor="month-slider" className="sr-only">
          Month of the rollout, 0 to {LAST_MONTH}
        </label>
        <div className="relative">
          {/* Phase bands behind the slider, with progress filled up to the selected month. */}
          <div className={`pointer-events-none absolute inset-y-0 left-0 right-0 ${THUMB_INSET} flex items-center`} aria-hidden>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-panel-2">
              {PHASES.map((p, i) => {
                const left = Math.max(0, p.start - 0.5) / LAST_MONTH;
                const right = Math.min(LAST_MONTH, p.end + 0.5) / LAST_MONTH;
                return (
                  <div
                    key={p.id}
                    className={`absolute inset-y-0 ${i % 2 ? "bg-edge-2/80" : "bg-edge/80"}`}
                    style={{ left: `${left * 100}%`, width: `${(right - left) * 100}%` }}
                  />
                );
              })}
              <div
                className="absolute inset-y-0 left-0 bg-linear-to-r from-speed/50 to-speed motion-safe:transition-[width] motion-safe:duration-300"
                style={{ width: pct(month) }}
              />
            </div>
          </div>
          <input
            id="month-slider"
            type="range"
            min={0}
            max={LAST_MONTH}
            step={1}
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            aria-valuetext={`Month ${month}, ${phase.name}`}
            className="relative h-9 w-full cursor-pointer appearance-none bg-transparent max-sm:[&::-moz-range-thumb]:h-6 max-sm:[&::-moz-range-thumb]:w-6 max-sm:[&::-webkit-slider-thumb]:h-6 max-sm:[&::-webkit-slider-thumb]:w-6 sm:h-7 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-bg [&::-moz-range-thumb]:bg-ink [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg [&::-webkit-slider-thumb]:bg-ink [&::-webkit-slider-thumb]:ring-2 ring-accent/40"
          />
        </div>

        {/* Month numbers, with a dot where something happened. */}
        <div className={`relative ${THUMB_INSET} h-6 sm:h-7`} aria-hidden>
          {Array.from({ length: LAST_MONTH + 1 }, (_, m) => {
            const event = EVENTS.find((e) => e.month === m);
            return (
              <span
                key={m}
                className={`absolute top-0 flex -translate-x-1/2 flex-col items-center gap-0.5 font-mono text-3xs ${
                  m === month ? "font-semibold text-ink" : m < month ? "text-dim" : "text-faint"
                }`}
                style={{ left: pct(m) }}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    event ? (m <= month ? TONE_DOT[event.tone] : "bg-edge-2") : "bg-transparent"
                  }`}
                />
                {m}
              </span>
            );
          })}
        </div>

        {/* Phase names under their bands. */}
        <div className={`relative ${THUMB_INSET} hidden h-4 sm:block`} aria-hidden>
          {PHASES.map((p) => {
            const left = Math.max(0, p.start - 0.5) / LAST_MONTH;
            const right = Math.min(LAST_MONTH, p.end + 0.5) / LAST_MONTH;
            return (
              <span
                key={p.id}
                className={`absolute truncate text-center text-3xs uppercase tracking-wider ${
                  p.id === phase.id ? "text-ink" : "text-faint"
                }`}
                style={{ left: `${left * 100}%`, width: `${(right - left) * 100}%` }}
              >
                {p.name}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

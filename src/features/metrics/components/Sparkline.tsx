import { baselineOf } from "../logic";

const W = 132;
const H = 44;
const PAD_X = 5;
const PAD_Y = 6;

type Props = {
  series: readonly number[];
  month: number;
  label: string;
  /** Tailwind text colour class; the line uses currentColor. */
  colorClass: string;
  threshold?: { value: number; label: string };
};

/**
 * A small hand-drawn trend. The year so far is drawn in colour, the rest faintly,
 * with the baseline dashed and the selected month marked.
 */
export function Sparkline({ series, month, label, colorClass, threshold }: Props) {
  const base = baselineOf(series);
  const values = [...series, base, ...(threshold ? [threshold.value] : [])];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const last = series.length - 1;

  const x = (i: number) => PAD_X + (i / last) * (W - PAD_X * 2);
  const y = (v: number) => PAD_Y + (1 - (v - min) / span) * (H - PAD_Y * 2);
  const points = (upTo: number) =>
    series
      .slice(0, upTo + 1)
      .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");

  const current = series[month] ?? series[last] ?? 0;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${label}: trend over twelve months, month ${month} marked`}
      className={`shrink-0 overflow-visible ${colorClass}`}
    >
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={y(base)}
        y2={y(base)}
        stroke="var(--color-faint)"
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      {threshold && (
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={y(threshold.value)}
          y2={y(threshold.value)}
          stroke="var(--color-warn)"
          strokeOpacity={0.7}
          strokeWidth={1}
          strokeDasharray="4 2"
        >
          <title>{threshold.label}</title>
        </line>
      )}
      <polyline points={points(last)} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={1.5} />
      <polyline
        points={points(month)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <line x1={x(month)} x2={x(month)} y1={2} y2={H - 2} stroke="currentColor" strokeOpacity={0.25} />
      <circle cx={x(month)} cy={y(current)} r={6} fill="currentColor" fillOpacity={0.2} />
      <circle cx={x(month)} cy={y(current)} r={3} fill="currentColor" stroke="var(--color-panel)" strokeWidth={1.5} />
    </svg>
  );
}

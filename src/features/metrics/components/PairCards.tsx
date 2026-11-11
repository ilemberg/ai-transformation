import { PAIRS, type Metric } from "../data";
import { deltaVsBaseline, formatDelta, formatValue, metricById, pairVerdict, valueAt, type Verdict } from "../logic";
import { Sparkline } from "./Sparkline";
import { DeltaText, KIND_TEXT, KindTag, SectionHeading, VerdictChip } from "./ui";

const CARD_BORDER: Record<Verdict, string> = {
  Healthy: "border-edge",
  Watch: "border-warn/40",
  Regression: "border-fail/60 shadow-[0_0_0_1px_rgb(248_113_113/0.25),0_0_32px_-8px_rgb(248_113_113/0.45)]",
};

function MetricRow({ metric, month }: { metric: Metric; month: number }) {
  const delta = deltaVsBaseline(metric, month);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <KindTag kind={metric.kind} />
          <span className="truncate text-sm text-dim">{metric.short}</span>
        </div>
        <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${KIND_TEXT[metric.kind]}`}>
          {formatValue(metric, valueAt(metric.series, month))}
        </p>
        <p className="mt-0.5 text-xs text-faint">
          <DeltaText delta={delta} text={formatDelta(metric, delta)} /> <span>vs baseline</span>
        </p>
      </div>
      <Sparkline
        series={metric.series}
        month={month}
        label={metric.short}
        colorClass={KIND_TEXT[metric.kind]}
        threshold={metric.threshold}
      />
    </div>
  );
}

export function PairCards({ month }: { month: number }) {
  return (
    <section aria-labelledby="pairs-heading">
      <SectionHeading id="pairs-heading" kicker="The principle" title="No speed metric is reported alone">
        Each speed number sits next to the quality number it could quietly damage. If speed improves while its
        partner gets worse than baseline, the pair reads <strong className="text-fail">Regression</strong>, however
        good the speed number looks.
      </SectionHeading>
      <div className="grid gap-4 md:grid-cols-2">
        {PAIRS.map((pair) => {
          const speed = metricById(pair.speed);
          const quality = metricById(pair.quality);
          const { verdict, reason } = pairVerdict(speed, quality, month);
          return (
            <article
              key={pair.id}
              aria-label={`${speed.short} with ${quality.short}: ${verdict}`}
              className={`rounded-xl border bg-panel p-4 motion-safe:transition-[border-color,box-shadow] motion-safe:duration-500 sm:p-5 ${CARD_BORDER[verdict]}`}
            >
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug">
                    <span className="text-speed">{speed.short}</span>
                    <span className="mx-1.5 text-faint" aria-hidden>
                      ↔
                    </span>
                    <span className="sr-only"> with </span>
                    <span className="text-quality">{quality.short}</span>
                  </h3>
                  <p className="mt-1 text-xs text-dim">{pair.why}</p>
                </div>
                <VerdictChip verdict={verdict} />
              </header>
              <div className="mt-2 divide-y divide-edge">
                <MetricRow metric={speed} month={month} />
                <MetricRow metric={quality} month={month} />
              </div>
              <p className="mt-2 border-t border-edge pt-3 text-xs text-dim">{reason}</p>
            </article>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line x1="0" x2="18" y1="3" y2="3" stroke="var(--color-faint)" strokeDasharray="2 3" />
          </svg>
          baseline (months 0–1)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line x1="0" x2="18" y1="3" y2="3" stroke="var(--color-warn)" strokeDasharray="4 2" />
          </svg>
          SLO or threshold
        </span>
        <span>Changes inside each metric&apos;s noise band count as no change.</span>
      </p>
    </section>
  );
}

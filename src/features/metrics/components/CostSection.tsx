import { MONTHS, TIER_SHARES, type TierShare } from "../data";
import { deltaVsBaseline, formatDelta, formatValue, metricById, valueAt } from "../logic";
import { DeltaText, SectionHeading } from "./ui";

const TIERS: readonly { key: keyof TierShare; label: string; bg: string; text: string; job: string }[] = [
  { key: "large", label: "Large", bg: "bg-large", text: "text-large", job: "design, hard bugs" },
  { key: "medium", label: "Medium", bg: "bg-medium", text: "text-medium", job: "most changes, review" },
  { key: "small", label: "Small", bg: "bg-small", text: "text-small", job: "lint fixes, test scaffolds" },
];

const LEVERS = [
  "Right model per job",
  "Prompt caching",
  "Batch runs for evals",
  "Ephemeral cloud sandboxes, torn down after each run",
];

export function CostSection({ month }: { month: number }) {
  const spend = metricById("spend");
  const cache = metricById("cacheHit");
  const maxSpend = Math.max(...spend.series) * 1.15;
  const yPct = (v: number) => 100 - (v / maxSpend) * 100;
  const xPct = (i: number) => ((i + 0.5) / MONTHS) * 100;
  const linePoints = (upTo: number) =>
    spend.series
      .slice(0, upTo + 1)
      .map((v, i) => `${(i + 0.5).toFixed(2)},${yPct(v).toFixed(2)}`)
      .join(" ");
  const share = TIER_SHARES[month] ?? { small: 0, medium: 0, large: 0 };
  const spendNow = valueAt(spend.series, month);
  const spendDelta = deltaVsBaseline(spend, month);
  const cacheDelta = deltaVsBaseline(cache, month);

  return (
    <section aria-labelledby="cost-heading">
      <SectionHeading id="cost-heading" kicker="Cost" title="Spend rises first, then falls as work is routed">
        The pilot and expansion lean on the largest model, so spend per merged change jumps. From month 7 most tokens go to small and
        medium models and the prompt cache does more of the work.
      </SectionHeading>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <figure className="rounded-md border border-edge bg-panel p-4 sm:p-5">
          <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
            <span className="font-medium text-ink">Token share by model tier</span>
            {TIERS.map((t) => (
              <span key={t.key} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${t.bg}`} />
                {t.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-4 rounded bg-ink" />
              AI spend per merged change
            </span>
          </figcaption>

          <div
            className="relative mt-4 h-52 sm:h-60"
            role="img"
            aria-label={`Month ${month}: ${share.small}% of tokens on small models, ${share.medium}% medium, ${share.large}% large. AI spend per merged change ${formatValue(spend, spendNow)}.`}
          >
            <div className="absolute inset-0 flex">
              {TIER_SHARES.map((s, i) => (
                <div key={i} className="flex h-full flex-1 flex-col justify-end px-[2px] sm:px-1">
                  <div
                    className={`flex h-full flex-col overflow-hidden rounded-[3px] motion-safe:transition-opacity motion-safe:duration-300 ${
                      i > month ? "opacity-20" : i === month ? "opacity-100 ring-2 ring-ink/70" : "opacity-70"
                    }`}
                  >
                    {TIERS.map((t) => (
                      <div key={t.key} className={t.bg} style={{ height: `${s[t.key]}%` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${MONTHS} 100`}
              preserveAspectRatio="none"
              aria-hidden
            >
              <polyline
                points={linePoints(MONTHS - 1)}
                fill="none"
                stroke="var(--color-ink)"
                strokeOpacity={0.3}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={linePoints(month)}
                fill="none"
                stroke="var(--color-bg)"
                strokeWidth={5}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={linePoints(month)}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {spend.series.slice(0, month + 1).map((v, i) => (
              <span
                key={i}
                aria-hidden
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-ink ${
                  i === month ? "h-3.5 w-3.5" : "h-2 w-2"
                }`}
                style={{ left: `${xPct(i)}%`, top: `${yPct(v)}%` }}
              />
            ))}
            <span
              aria-hidden
              className={`absolute -translate-y-[170%] whitespace-nowrap rounded bg-bg/90 px-1.5 py-0.5 font-mono text-xs font-semibold text-ink ${
                month > MONTHS / 2 ? "-translate-x-full" : ""
              }`}
              style={{ left: `${xPct(month)}%`, top: `${yPct(spendNow)}%` }}
            >
              {formatValue(spend, spendNow)}
            </span>
          </div>
          <div className="mt-2 flex font-mono text-3xs text-faint" aria-hidden>
            {TIER_SHARES.map((_, i) => (
              <span key={i} className={`flex-1 text-center ${i === month ? "font-semibold text-ink" : ""}`}>
                {i}
              </span>
            ))}
          </div>
          <p className="mt-1 text-center text-2xs text-faint">Month</p>
        </figure>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-edge bg-panel p-4">
            <p className="text-xs text-dim">AI spend per merged change, month {month}</p>
            <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">{formatValue(spend, spendNow)}</p>
            <p className="mt-1 text-xs text-faint">
              <DeltaText delta={spendDelta} text={formatDelta(spend, spendDelta)} /> vs baseline · target ≤{" "}
              {formatValue(spend, spend.target?.value ?? 0)}
            </p>
            <div className="mt-4 space-y-2">
              {TIERS.map((t) => (
                <div key={t.key}>
                  <div className="flex justify-between text-xs">
                    <span className={t.text}>
                      {t.label} <span className="text-faint">· {t.job}</span>
                    </span>
                    <span className="font-mono tabular-nums text-dim">{share[t.key]}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel-2">
                    <div
                      className={`h-full rounded-full ${t.bg} motion-safe:transition-[width] motion-safe:duration-500`}
                      style={{ width: `${share[t.key]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-edge pt-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-dim">Prompt-cache hit rate</span>
                <span className="font-mono text-base font-semibold tabular-nums">
                  {formatValue(cache, valueAt(cache.series, month))}
                </span>
              </div>
              <p className="mt-0.5 text-right text-xs">
                <DeltaText delta={cacheDelta} text={formatDelta(cache, cacheDelta)} />
              </p>
            </div>
          </div>
          <div className="rounded-md border border-edge bg-panel-2/60 p-4 text-xs leading-relaxed text-dim">
            <p className="font-medium text-ink">The levers</p>
            <p className="mt-1">{LEVERS.join(" · ")}.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

import { MONTHS, SIGNALS, type Metric } from "../data";
import {
  CAUGHT,
  CHANGES,
  CHECKOUT_CONVERSION,
  comprehensionAt,
  DUPLICATE_CHARGE_INCIDENTS,
  REBOOK_SUCCESS,
  COHORT_CYCLE,
  containment,
  codingCycleTime,
  cycleStages,
  leadTime,
  ESCAPED_BY_SEVERITY,
  GATE_KINDS,
  GATE_LABEL,
  SEVERITIES,
  SEVERITY_LABEL,
  STAGE_LABEL,
  STAGES,
} from "../delivery";
import { deltaVsBaseline, formatDelta, formatTarget, formatValue, meetsTarget, metricById, valueAt } from "../logic";
import { Sparkline } from "./Sparkline";
import { DeltaText, Gadget, KIND_TEXT, SectionHeading } from "./ui";

const MONTH_IDS = Array.from({ length: MONTHS }, (_, i) => i);

// ------------------------------------------------------------------ pieces

function MetricTile({ id, month, note }: { id: string; month: number; note?: string }) {
  const metric = metricById(id);
  const delta = deltaVsBaseline(metric, month);
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-edge bg-card p-3">
      <div className="min-w-0">
        <div className="truncate text-xs text-dim">{metric.short}</div>
        <div className={`font-mono text-lg font-semibold tabular-nums sm:text-xl ${metric.descriptive ? "text-dim" : KIND_TEXT[metric.kind]}`}>
          {formatValue(metric, valueAt(metric.series, month))}
        </div>
        <DeltaText delta={delta} text={formatDelta(metric, delta)} />
        {note && <div className="mt-0.5 text-2xs text-faint">{note}</div>}
      </div>
      <Sparkline
        series={metric.series}
        month={month}
        label={metric.short}
        colorClass={metric.descriptive ? "text-dim" : KIND_TEXT[metric.kind]}
        threshold={metric.threshold}
      />
    </div>
  );
}

type Segment = { key: string; label: string; fill: string; dot: string; values: (m: number) => number };

/** Thirteen stacked bars, months after the selected one faded, the selected one outlined. */
function StackedBars({ segments, month, unit, title }: { segments: Segment[]; month: number; unit: string; title: string }) {
  const W = 520;
  const H = 150;
  const PAD = 18;
  const totals = MONTH_IDS.map((m) => segments.reduce((n, s) => n + s.values(m), 0));
  const max = Math.max(...totals) * 1.08;
  const bw = (W - PAD) / MONTHS;
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H + 21}`} className="h-auto max-h-60 w-full" role="img" aria-label={title}>
        {MONTH_IDS.map((m) => {
          let y = H;
          return (
            <g key={m} opacity={m > month ? 0.25 : 1}>
              {segments.map((s) => {
                const h = (s.values(m) / max) * (H - 4);
                y -= h;
                return <rect key={s.key} x={PAD + m * bw + 3} y={y} width={bw - 6} height={Math.max(0, h)} className={s.fill} />;
              })}
              {m === month && (
                <rect
                  x={PAD + m * bw + 1.5}
                  y={H - (totals[m] / max) * (H - 4) - 2}
                  width={bw - 3}
                  height={(totals[m] / max) * (H - 4) + 2}
                  fill="none"
                  className="stroke-ink"
                  strokeWidth={1.5}
                  rx={2}
                />
              )}
              <text x={PAD + m * bw + bw / 2} y={H + 16} textAnchor="middle" className={`text-3xs max-sm:text-[17px] ${m === month ? "fill-ink font-semibold" : "fill-faint"}`}>
                {m}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
        {segments.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${s.dot}`} />
            {s.label}
            <span className="font-mono text-ink">
              {s.values(month).toFixed(unit === "h" ? 1 : 0)}
              {unit === "h" ? " h" : ""}
            </span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------- velocity

const STAGE_STYLE: Record<(typeof STAGES)[number], { fill: string; dot: string }> = {
  plan: { fill: "fill-purple", dot: "bg-purple" },
  build: { fill: "fill-brand", dot: "bg-brand" },
  review: { fill: "fill-warn", dot: "bg-warn" },
  gates: { fill: "fill-small", dot: "bg-small" },
  release: { fill: "fill-pass", dot: "bg-pass" },
};

export function VelocitySection({ month }: { month: number }) {
  const stages = cycleStages(month);
  const biggest = STAGES.reduce((a, b) => (stages[a] >= stages[b] ? a : b));
  return (
    <Gadget>
      <SectionHeading id="velocity-heading" kicker="" title="Velocity: how fast work reaches customers" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold">Where the time goes</div>
          <div className="flex flex-wrap gap-x-4 text-xs text-dim">
            <span>
              Lead time, spec started to production: <span className="font-mono font-semibold text-ink">{leadTime(month).toFixed(1)} h</span>
            </span>
            <span>
              Coding cycle time, first commit to production:{" "}
              <span className="font-mono font-semibold text-ink">{codingCycleTime(month).toFixed(0)} h</span>
            </span>
          </div>
          <div className="text-xs text-dim">
            Median hours by stage. Biggest stage in month {month}:{" "}
            <span className="font-semibold text-ink">{STAGE_LABEL[biggest].toLowerCase()}</span>.
          </div>
          <StackedBars
            title="Lead time by stage, months 0 to 12"
            month={month}
            unit="h"
            segments={STAGES.map((s) => ({
              key: s,
              label: STAGE_LABEL[s],
              ...STAGE_STYLE[s],
              values: (m) => cycleStages(m)[s],
            }))}
          />
        </div>
        <div className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <MetricTile id="cycleTime" month={month} />
          <MetricTile id="throughput" month={month} />
          <MetricTile id="deployFreq" month={month} />
          <MetricTile id="reviewLatency" month={month} />
          <MetricTile id="prSize" month={month} note="change-size v3 from month 6" />
        </div>
      </div>
    </Gadget>
  );
}

// ----------------------------------------------------------------- quality

const SEV_STYLE: Record<(typeof SEVERITIES)[number], { fill: string; dot: string }> = {
  sev1: { fill: "fill-fail", dot: "bg-fail" },
  sev2: { fill: "fill-large", dot: "bg-large" },
  sev3: { fill: "fill-edge-2", dot: "bg-edge-2" },
};

const GATE_STYLE: Record<(typeof GATE_KINDS)[number], { fill: string; dot: string }> = {
  review: { fill: "fill-purple", dot: "bg-purple" },
  tests: { fill: "fill-brand", dot: "bg-brand" },
  evals: { fill: "fill-medium", dot: "bg-medium" },
  stress: { fill: "fill-large", dot: "bg-large" },
  canary: { fill: "fill-small", dot: "bg-small" },
};

function ReworkTile({ month }: { month: number }) {
  const agent = valueAt(metricById("rework").series, month);
  const human = valueAt(SIGNALS.humanRework, month);
  const worse = agent > human;
  return (
    <div className="rounded-md border border-edge bg-card p-3">
      <div className="text-xs text-dim">Rewritten within 21 days</div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <div>
          <div className="text-2xs text-faint">Agent code</div>
          <div className={`font-mono text-xl font-semibold ${worse ? "text-fail" : "text-quality"}`}>{agent.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-2xs text-faint">Human code</div>
          <div className="font-mono text-xl font-semibold text-dim">{human.toFixed(1)}%</div>
        </div>
      </div>
      <div className={`mt-1 text-2xs ${worse ? "text-fail" : "text-pass"}`}>
        {worse ? "Agent code is reworked more: fix specs and context" : "Agent code holds up as well as human code"}
      </div>
    </div>
  );
}

export function QualitySection({ month }: { month: number }) {
  const escaped = SEVERITIES.reduce((n, s) => n + ESCAPED_BY_SEVERITY[s][month], 0);
  return (
    <Gadget>
      <SectionHeading id="quality-heading" kicker="" title="Quality: what breaks, and where it is caught" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile id="cfr" month={month} />
        <MetricTile id="mttr" month={month} />
        <MetricTile id="evalPass" month={month} />
        <ReworkTile month={month} />
      </div>
      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold">Caught before every customer saw it</div>
          <div className="text-xs text-dim">
            Problems stopped by each gate. In month {month}, {(containment(month) * 100).toFixed(0)}% of all problems found
            were stopped before reaching everyone.
          </div>
          <StackedBars
            title="Problems caught by gate, months 0 to 12"
            month={month}
            unit="n"
            segments={GATE_KINDS.map((g) => ({ key: g, label: GATE_LABEL[g], ...GATE_STYLE[g], values: (m) => CAUGHT[g][m] }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold">Reached customers</div>
          <div className="text-xs text-dim">
            Bugs first found in production, by severity: {escaped} in month {month}.
          </div>
          <StackedBars
            title="Bugs that reached customers by severity, months 0 to 12"
            month={month}
            unit="n"
            segments={SEVERITIES.map((s) => ({
              key: s,
              label: SEVERITY_LABEL[s],
              ...SEV_STYLE[s],
              values: (m) => ESCAPED_BY_SEVERITY[s][m],
            }))}
          />
        </div>
      </div>
    </Gadget>
  );
}

// --------------------------------------------------------------- improving

const IMPROVING_IDS = ["cycleTime", "throughput", "deployFreq", "reviewLatency", "cfr", "mttr", "escaped", "rework", "evalPass", "devex"];

function Status({ metric, month }: { metric: Metric; month: number }) {
  const ok = meetsTarget(metric.target, valueAt(metric.series, month));
  if (ok === null) return <span className="text-faint">—</span>;
  return ok ? (
    <span className="rounded-[3px] bg-pass-bg px-1 text-2xs font-bold uppercase text-pass-text">On target</span>
  ) : (
    <span className="rounded-[3px] bg-warn-bg px-1 text-2xs font-bold uppercase text-warn">Not yet</span>
  );
}

function CohortChart({ month }: { month: number }) {
  const W = 520;
  const H = 150;
  const PAD = 24;
  const all = [...COHORT_CYCLE.pilot, ...COHORT_CYCLE.others];
  const min = Math.min(...all) - 2;
  const max = Math.max(...all) + 2;
  const x = (m: number) => PAD + (m / (MONTHS - 1)) * (W - PAD * 2);
  const y = (v: number) => 8 + (1 - (v - min) / (max - min)) * (H - 16);
  const line = (s: readonly number[]) => s.map((v, m) => `${m ? "L" : "M"}${x(m)},${y(v)}`).join(" ");
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${H + 21}`} className="h-auto w-full" role="img" aria-label="Cycle time: pilot teams against the other four teams">
        {CHANGES.map((c) => (
          <line key={c.month} x1={x(c.month)} x2={x(c.month)} y1={4} y2={H} strokeDasharray="3 3" className="stroke-edge-2" />
        ))}
        <line x1={x(month)} x2={x(month)} y1={2} y2={H} className="stroke-ink" strokeWidth={1.5} />
        <path d={line(COHORT_CYCLE.others)} fill="none" strokeWidth={2.5} className="stroke-edge-2" />
        <path d={line(COHORT_CYCLE.pilot)} fill="none" strokeWidth={2.5} className="stroke-brand" />
        <circle cx={x(month)} cy={y(COHORT_CYCLE.pilot[month])} r={4} className="fill-brand" />
        <circle cx={x(month)} cy={y(COHORT_CYCLE.others[month])} r={4} className="fill-edge-2" />
        {MONTH_IDS.map((m) => (
          <text key={m} x={x(m)} y={H + 16} textAnchor="middle" className={`text-3xs max-sm:text-[17px] ${m === month ? "fill-ink font-semibold" : "fill-faint"}`}>
            {m}
          </text>
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 text-xs text-dim">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 bg-brand" /> Pilot teams (Search, Rebooking){" "}
          <span className="font-mono text-ink">{COHORT_CYCLE.pilot[month]} h</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 bg-edge-2" /> Other four teams{" "}
          <span className="font-mono text-ink">{COHORT_CYCLE.others[month]} h</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 border-l border-dashed border-edge-2" /> A change to how teams work
        </span>
      </figcaption>
    </figure>
  );
}

function OutcomeTile({
  label,
  value,
  series,
  month,
  note,
}: {
  label: string;
  value: string;
  series?: readonly number[];
  month: number;
  note: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md border border-edge bg-card p-3 sm:flex sm:flex-col sm:items-stretch">
      <div className="min-w-0">
        <div className="text-xs text-dim">{label}</div>
        <div className="font-mono text-lg font-semibold text-quality">{value}</div>
      </div>
      {series && <Sparkline series={series} month={month} label={label} colorClass="text-quality" />}
      <div className="col-span-2 text-2xs text-faint">{note}</div>
    </div>
  );
}

/** Did the product get better for travellers, and can engineers still own the code? */
function OutcomesRow({ month }: { month: number }) {
  const check = comprehensionAt(month);
  const dupYear = DUPLICATE_CHARGE_INCIDENTS.slice(Math.max(0, month - 11), month + 1).reduce((a, b) => a + b, 0);
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <OutcomeTile
        label="Rebooked within policy, 2 h"
        value={`${REBOOK_SUCCESS[month]}%`}
        series={REBOOK_SUCCESS}
        month={month}
        note={`Baseline ${REBOOK_SUCCESS[0]}% · assistant live from month 9`}
      />
      <OutcomeTile
        label="Checkout conversion"
        value={`${CHECKOUT_CONVERSION[month].toFixed(2)}%`}
        series={CHECKOUT_CONVERSION}
        month={month}
        note={`Baseline ${CHECKOUT_CONVERSION[0].toFixed(2)}% · search fix from month 10`}
      />
      <OutcomeTile
        label="Duplicate-charge incidents"
        value={`${DUPLICATE_CHARGE_INCIDENTS[month]} this month`}
        series={DUPLICATE_CHARGE_INCIDENTS}
        month={month}
        note={`${dupYear} in the last 12 months`}
      />
      <OutcomeTile
        label="Engineers own agent-written code"
        value={check ? `${check.passed} of ${check.sessions}` : "—"}
        month={month}
        note={check ? `Quarterly check, month ${check.month}: ${check.note}` : "First quarterly check in month 3"}
      />
    </div>
  );
}

export function ImprovingSection({ month }: { month: number }) {
  const share = metricById("agentShare");
  const changes = CHANGES.filter((c) => c.month <= month);
  return (
    <Gadget>
      <SectionHeading id="improving-heading" kicker="" title="Improving: for travellers, against baseline, and against teams not yet changed" />
      <OutcomesRow month={month} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <ul className="divide-y divide-edge sm:hidden">
            {IMPROVING_IDS.map((id) => {
              const m = metricById(id);
              const d = deltaVsBaseline(m, month);
              return (
                <li key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 py-2.5">
                  <span className="font-medium">{m.short}</span>
                  <span className="text-right font-mono font-semibold">{formatValue(m, valueAt(m.series, month))}</span>
                  <span className="text-xs text-dim">
                    from <span className="font-mono">{formatValue(m, m.series[0])}</span> · target{" "}
                    <span className="font-mono">{formatTarget(m)}</span>
                  </span>
                  <span className="text-right">
                    <Status metric={m} month={month} />
                  </span>
                  <span className="col-span-2">
                    <DeltaText delta={d} text={formatDelta(m, d)} />
                  </span>
                </li>
              );
            })}
          </ul>
          <table className="hidden w-full text-sm sm:table">
            <thead className="text-left text-2xs font-bold uppercase text-faint">
              <tr className="border-b border-edge">
                <th className="py-2 pr-3 font-bold">Metric</th>
                <th className="py-2 pr-3 font-bold">Baseline</th>
                <th className="py-2 pr-3 font-bold">Month {month}</th>
                <th className="py-2 pr-3 font-bold">Change</th>
                <th className="py-2 pr-3 font-bold">Target</th>
                <th className="py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {IMPROVING_IDS.map((id) => {
                const m = metricById(id);
                const d = deltaVsBaseline(m, month);
                return (
                  <tr key={id} className="border-b border-edge last:border-0">
                    <td className="py-2 pr-3">{m.short}</td>
                    <td className="py-2 pr-3 font-mono text-dim">{formatValue(m, m.series[0])}</td>
                    <td className="py-2 pr-3 font-mono font-semibold">{formatValue(m, valueAt(m.series, month))}</td>
                    <td className="py-2 pr-3">
                      <DeltaText delta={d} text={formatDelta(m, d)} />
                    </td>
                    <td className="py-2 pr-3 font-mono text-dim">{formatTarget(m)}</td>
                    <td className="py-2">
                      <Status metric={m} month={month} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 rounded-md bg-neutral-bg px-3 py-2 text-xs text-dim">
            <span className="font-semibold text-ink">Context, not a goal:</span> {formatValue(share, valueAt(share.series, month))}{" "}
            of merged code was first written by an agent in month {month}. More agent code is not an outcome in itself, so it
            is never scored.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold">Is it the rollout, or would it have happened anyway?</div>
          <div className="text-xs text-dim">
            Median cycle time for the two pilot teams against the four that joined later.
          </div>
          <CohortChart month={month} />
          {changes.length > 0 && (
            <ol className="mt-1 flex flex-col gap-1 text-xs">
              {changes.map((c) => (
                <li key={c.month} className="flex gap-2">
                  <span className="w-8 shrink-0 font-mono text-faint">M{c.month}</span>
                  <span className="text-dim">{c.label}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Gadget>
  );
}

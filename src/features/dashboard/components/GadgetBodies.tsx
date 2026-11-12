import { LAST_MONTH, MONTHS, PAIRS, PHASES, RULES, type TierShare } from "@/features/metrics/data";
import {
  baselineOf,
  deltaVsBaseline,
  formatDelta,
  metricById,
  pairVerdict,
  phaseFor,
  ruleStatus,
  valueAt,
  type RuleStatus,
} from "@/features/metrics/logic";
import { Sparkline } from "@/features/metrics/components/Sparkline";
import { DeltaText, VerdictChip } from "@/features/metrics/components/ui";
import { totalsFor } from "@/features/line/logic";
import { TICKETS } from "@/features/line/tickets";
import {
  AI_BUDGET,
  ESCAPED_BY_SEVERITY,
  PAYROLL_PER_MONTH,
  REQUEST_TO_LIVE_DAYS,
  SEVERITIES,
  SEVERITY_LABEL,
  SHIPPED,
  WORK_LABEL,
  WORK_TYPES,
  shippedTotal,
  type WorkType,
  CHECKOUT_CONVERSION,
  comprehensionAt,
  DUPLICATE_CHARGE_INCIDENTS,
  REBOOK_SUCCESS,
  SUCCESSFUL_BOOKINGS,
} from "@/features/metrics/delivery";
import {
  ENGINEERS,
  SLO,
  budgetCheck,
  budgetToDate,
  costPerShipped,
  errorBudget,
  forecastQuarter,
  formatDollars,
  fromPeak,
  incidentSeries,
  incidentsAt,
  monthlySpend,
  payrollShare,
  shippedPerEngineer,
  shippedSeries,
  spendByTeam,
  spendByTier,
  spendPerEngineer,
  spendSeries,
} from "../derive";
import type { GadgetId } from "../gadgets";

/** Every gadget body is drawn for one month of the rollout. */
export type GadgetBodyProps = { month: number };

type Tone = "neutral" | "info" | "pass" | "fail" | "warn" | "purple";

const LOZENGE: Record<Tone, string> = {
  neutral: "bg-neutral-bg text-dim",
  info: "bg-info-bg text-info-text",
  pass: "bg-pass-bg text-pass-text",
  fail: "bg-fail-bg text-fail-text",
  warn: "bg-warn-bg text-warn",
  purple: "bg-purple-bg text-purple",
};

export function Lozenge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex h-4 shrink-0 items-center whitespace-nowrap rounded-[3px] px-1 text-[11px] font-bold uppercase leading-none ${LOZENGE[tone]}`}
    >
      {children}
    </span>
  );
}

/** Number with its prefix big and its unit small, e.g. "18.7" + "/ team / wk". */
function Value({ id, month, size = "lg" }: { id: string; month: number; size?: "lg" | "md" }) {
  const m = metricById(id);
  const v = valueAt(m.series, month);
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className={`font-semibold tabular-nums text-ink ${size === "lg" ? "text-[28px] leading-8" : "text-xl leading-7"}`}>
        {m.prefix ?? ""}
        {v.toFixed(m.decimals)}
      </span>
      {m.suffix.trim() && <span className="text-xs text-dim">{m.suffix.trim()}</span>}
    </span>
  );
}

function Delta({ id, month }: { id: string; month: number }) {
  const m = metricById(id);
  const d = deltaVsBaseline(m, month);
  return (
    <span className="flex flex-wrap items-baseline gap-x-1">
      <DeltaText delta={d} text={formatDelta(m, d)} />
      <span className="text-xs text-faint">vs baseline</span>
    </span>
  );
}

/** One metric: label, number, change against baseline, and its year as a sparkline. */
function MetricStat({
  id,
  month,
  colorClass,
  size = "lg",
  label,
  compare = "baseline",
}: {
  id: string;
  month: number;
  colorClass: string;
  size?: "lg" | "md";
  label?: string;
  compare?: "baseline" | "peak";
}) {
  const m = metricById(id);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-dim">{label ?? m.short}</div>
        <Value id={id} month={month} size={size} />
        {compare === "peak" ? <PeakDelta series={m.series} month={month} /> : <Delta id={id} month={month} />}
      </div>
      <Sparkline series={m.series} month={month} label={m.short} colorClass={colorClass} threshold={m.threshold} />
    </div>
  );
}

// Token spend

const TIERS: readonly { key: keyof TierShare; label: string; bg: string }[] = [
  { key: "large", label: "Large", bg: "bg-large" },
  { key: "medium", label: "Medium", bg: "bg-medium" },
  { key: "small", label: "Small", bg: "bg-small" },
];

function TokenSpend({ month }: GadgetBodyProps) {
  const spends = Array.from({ length: MONTHS }, (_, m) => ({ month: m, ...spendByTier(m) }));
  const max = Math.max(...spends.map((s) => s.total));
  const now = spendByTier(month);
  const sofar = spends.slice(0, month + 1);
  const peak = sofar.reduce((a, b) => (b.total > a.total ? b : a));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-xs font-medium text-dim">Month {month} AI spend</div>
          <span className="text-[28px] font-semibold leading-8 tabular-nums">{formatDollars(now.total)}</span>
          <span className="ml-1 text-xs text-dim">/ month</span>
          <div className="text-xs text-faint">
            {formatDollars(spendPerEngineer(month))} per engineer
            {peak.month !== month && (
              <>
                {" "}
                · peak so far {formatDollars(peak.total)} in month {peak.month}
              </>
            )}
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim" aria-label={`Month ${month} spend by model size`}>
          {TIERS.map((t) => (
            <li key={t.key} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${t.bg}`} />
              {t.label} <span className="font-medium tabular-nums text-ink">{formatDollars(now[t.key])}</span>
            </li>
          ))}
        </ul>
      </div>
      <div
        role="img"
        aria-label={`Monthly AI spend, months 0 to ${month}: ${sofar.map((s) => `month ${s.month} ${formatDollars(s.total)}`).join(", ")}.`}
      >
        <div className="flex h-28 items-end gap-1 border-b border-edge">
          {spends.map((s) => (
            <div
              key={s.month}
              title={`Month ${s.month}: ${formatDollars(s.total)}`}
              className={`flex flex-1 flex-col overflow-hidden rounded-t-[3px] ${
                s.month === month ? "" : s.month < month ? "opacity-60" : "opacity-15"
              }`}
              style={{ height: `${(s.total / max) * 100}%` }}
            >
              {TIERS.map((t) => (
                <div key={t.key} className={t.bg} style={{ height: `${s.total ? (s[t.key] / s.total) * 100 : 0}%` }} />
              ))}
            </div>
          ))}
        </div>
        <div aria-hidden className="mt-1 flex gap-1 text-center text-[10px] tabular-nums text-faint">
          {spends.map((s) => (
            <span key={s.month} className={`flex-1 ${s.month === month ? "font-bold text-ink" : ""}`}>
              {s.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Deploys and change failures

function Release({ month }: GadgetBodyProps) {
  const deploys = metricById("deployFreq");
  const cfr = metricById("cfr");
  const { verdict, reason } = pairVerdict(deploys, cfr, month);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {[deploys, cfr].map((m) => (
          <div key={m.id} className="min-w-0">
            <div className="truncate text-xs font-medium text-dim">{m.short}</div>
            <Value id={m.id} month={month} size="md" />
            <Delta id={m.id} month={month} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-edge pt-2.5">
        <VerdictChip verdict={verdict} />
        <span className="min-w-0 truncate text-xs text-dim" title={reason}>
          {reason}
        </span>
      </div>
    </div>
  );
}

// Delivery health

function Health({ month }: GadgetBodyProps) {
  const rows = PAIRS.map((p) => {
    const speed = metricById(p.speed);
    const quality = metricById(p.quality);
    return { id: p.id, speed, quality, ...pairVerdict(speed, quality, month) };
  });
  const healthy = rows.filter((r) => r.verdict === "Healthy").length;
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm">
        <span className="text-[28px] font-semibold leading-8 tabular-nums">{healthy}</span>
        <span className="text-dim"> of {rows.length} pairs healthy</span>
      </div>
      <ul className="divide-y divide-edge">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 py-1.5" title={r.reason}>
            <span className="min-w-0 truncate text-sm">
              {r.speed.short} <span className="text-faint">vs</span> {r.quality.short.toLowerCase()}
            </span>
            <VerdictChip verdict={r.verdict} />
          </li>
        ))}
      </ul>
      <p className="border-t border-edge pt-2.5 text-xs leading-relaxed text-dim">
        DORA 2024: as AI adoption rose, delivery throughput fell an estimated 1.5% and stability 7.2%. The gates on the
        Board exist to beat that.
      </p>
    </div>
  );
}

// Uptime and error budget

function ErrorBudgetGadget({ month }: GadgetBodyProps) {
  const uptime = metricById("uptime");
  const b = errorBudget(valueAt(uptime.series, month));
  const pct = Math.round(b.leftShare * 100);
  const tone = b.leftShare > 0.5 ? "pass" : b.leftShare > 0.2 ? "warn" : "fail";
  const bar = { pass: "bg-pass", warn: "bg-warn", fail: "bg-fail" }[tone];
  const word = b.left <= 0 ? "Spent" : { pass: "Healthy", warn: "Low", fail: "Nearly spent" }[tone];
  return (
    <div className="flex flex-col gap-3">
      <MetricStat id="uptime" month={month} colorClass="text-quality" label="Uptime, trailing 30 days" />
      <div>
        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-dim">Error budget left</span>
          <Lozenge tone={tone}>{word}</Lozenge>
        </div>
        <div
          role="meter"
          aria-label="Error budget left"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={`${pct}% left: ${b.left.toFixed(1)} of ${b.budget.toFixed(1)} minutes`}
          className="h-2 overflow-hidden rounded-full bg-neutral-bg"
        >
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-xs tabular-nums text-dim">
          <span className="font-semibold text-ink">{b.left.toFixed(1)} min</span> of {b.budget.toFixed(1)} left ·{" "}
          {b.used.toFixed(1)} used
        </div>
      </div>
    </div>
  );
}

// AI adoption

function Adoption({ month }: GadgetBodyProps) {
  return (
    <div className="flex flex-col gap-3">
      <MetricStat id="agentShare" month={month} colorClass="text-speed" label="Agent-authored share of merged code" />
      <div className="border-t border-edge pt-3">
        <MetricStat id="rework" month={month} colorClass="text-quality" size="md" label="Rework rate, agent code" />
      </div>
    </div>
  );
}

// Eval pass rate

function Evals({ month }: GadgetBodyProps) {
  const m = metricById("evalPass");
  const v = valueAt(m.series, month);
  const threshold = m.threshold?.value ?? 92;
  const above = v >= threshold;
  return (
    <div className="flex flex-col gap-3">
      <MetricStat id="evalPass" month={month} colorClass="text-quality" />
      <div className="flex items-center gap-2 border-t border-edge pt-2.5 text-xs text-dim">
        <Lozenge tone={above ? "pass" : "fail"}>{above ? "Release open" : "Release blocked"}</Lozenge>
        <span>
          Threshold {threshold}% · {Math.abs(v - threshold).toFixed(0)} pts {above ? "above" : "below"}
        </span>
      </div>
    </div>
  );
}

// Decision rules

function statusLozenge(s: RuleStatus) {
  if (s.state === "active") return <Lozenge tone="fail">Firing</Lozenge>;
  if (s.state === "cleared") return <Lozenge tone="pass">Cleared m{s.clearedAt}</Lozenge>;
  return <Lozenge tone="neutral">Not fired</Lozenge>;
}

function Rules({ month }: GadgetBodyProps) {
  const rows = RULES.map((r) => ({ rule: r, status: ruleStatus(r, month) }));
  const firing = rows.filter((r) => r.status.state === "active").length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 text-sm">
        <span className={`text-[28px] font-semibold leading-8 tabular-nums ${firing > 0 ? "text-fail" : ""}`}>{firing}</span>
        <span className="text-dim">of {rows.length} rules firing</span>
      </div>
      <ul className="divide-y divide-edge">
        {rows.map(({ rule, status }) => (
          <li key={rule.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="min-w-0 truncate text-sm" title={`${rule.when}: ${rule.then}`}>
              {rule.when}
            </span>
            {statusLozenge(status)}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Cost per change

function CostPerChange({ month }: GadgetBodyProps) {
  return (
    <div className="flex flex-col gap-3">
      <MetricStat id="spend" month={month} colorClass="text-medium" label="AI spend per merged change" compare="peak" />
      <div className="border-t border-edge pt-3">
        <MetricStat id="cacheHit" month={month} colorClass="text-small" size="md" label="Prompt-cache hit rate" />
      </div>
    </div>
  );
}

// Rollout phase

function Phase({ month }: GadgetBodyProps) {
  const current = phaseFor(month);
  const pct = Math.round((month / LAST_MONTH) * 100);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-dim">Current phase</div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold leading-7">{current.name}</span>
          <Lozenge tone="info">In progress</Lozenge>
        </div>
        <div className="text-xs text-faint">
          Month {month} of {LAST_MONTH} · {pct}% through the year
        </div>
      </div>
      <div className="flex gap-1" aria-hidden>
        {PHASES.map((p) => (
          <div key={p.id} className="min-w-0" style={{ flex: p.end - p.start + 1 }}>
            <div
              className={`h-2 rounded-full ${p.id === current.id ? "bg-brand" : p.end < month ? "bg-pass" : "bg-neutral-bg"}`}
            />
          </div>
        ))}
      </div>
      <ul className="space-y-1 text-sm">
        {PHASES.map((p) => {
          const done = p.end < month;
          const now = p.id === current.id;
          return (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">
                {p.name}{" "}
                <span className="text-xs text-faint">
                  m{p.start}–{p.end}
                </span>
              </span>
              <Lozenge tone={now ? "info" : done ? "pass" : "neutral"}>{now ? "Current" : done ? "Done" : "To do"}</Lozenge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Tickets in flight (the Board as it is now; does not follow the month picker)

function formatUsdCents(usd: number): string {
  return usd < 100 ? `$${usd.toFixed(2)}` : formatDollars(usd);
}

function formatElapsed(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  if (m < 60 * 24) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
  }
  const days = Math.round((m / (60 * 24)) * 10) / 10;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

const KIND_TONE: Record<string, Tone> = { feature: "pass", bug: "fail", performance: "purple", task: "info" };

function Tickets() {
  const rows = TICKETS.map((t) => ({ ticket: t, totals: totalsFor(t) }));
  return (
    <table className="w-full table-fixed text-sm">
      <thead>
        <tr className="border-b border-edge text-left text-xs text-dim">
          <th scope="col" className="pb-1.5 font-medium">
            Ticket
          </th>
          <th scope="col" className="w-20 pb-1.5 text-right font-medium">
            Model spend
          </th>
          <th scope="col" className="w-24 pb-1.5 text-right font-medium">
            Elapsed
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-edge">
        {rows.map(({ ticket, totals }) => (
          <tr key={ticket.id}>
            <td className="py-2 pr-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 font-medium text-brand">{ticket.key}</span>
                <span className="hidden sm:inline-flex">
                  <Lozenge tone={KIND_TONE[ticket.kind] ?? "neutral"}>{ticket.kind}</Lozenge>
                </span>
              </div>
              <div className="truncate text-xs text-dim" title={ticket.title}>
                {ticket.title}
              </div>
            </td>
            <td className="py-2 text-right align-top tabular-nums">{formatUsdCents(totals.aiUsd)}</td>
            <td className="py-2 text-right align-top tabular-nums">{formatElapsed(totals.wallMinutes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Velocity({ month }: GadgetBodyProps) {
  return <MetricStat id="throughput" month={month} colorClass="text-speed" label="Merged changes per team per week" />;
}

function CycleTime({ month }: GadgetBodyProps) {
  return <MetricStat id="cycleTime" month={month} colorClass="text-speed" label="Median, first commit to production" />;
}

// ------------------------------------------------- executive gadgets: shared

const ALL_MONTHS = Array.from({ length: MONTHS }, (_, m) => m);

/** A series that is not a metric in data.ts, described well enough for the delta and the sparkline. */
type SeriesSpec = {
  series: readonly number[];
  lowerIsBetter: boolean;
  tolerance: number;
  deltaMode: "relative" | "absolute";
  deltaUnit?: string;
  decimals: number;
  prefix?: string;
};

function SeriesDelta({ spec, month }: { spec: SeriesSpec; month: number }) {
  const d = deltaVsBaseline(spec, month);
  return (
    <span className="flex flex-wrap items-baseline gap-x-1">
      <DeltaText delta={d} text={formatDelta(spec, d)} />
      <span className="text-xs text-faint">vs baseline</span>
    </span>
  );
}

function BigNumber({ value, unit }: { value: string; unit?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-[28px] font-semibold leading-8 tabular-nums text-ink">{value}</span>
      {unit && <span className="text-xs text-dim">{unit}</span>}
    </span>
  );
}

/**
 * Change from the highest month so far, for spend: below the peak is good.
 * Nothing in months 0–1, before the rollout gives a peak to compare with.
 */
function PeakDelta({ series, month }: { series: readonly number[]; month: number }) {
  const p = fromPeak(series, month);
  if (!p) return null;
  if (p.atPeak) {
    return (
      <span className="inline-flex items-baseline gap-1 font-mono text-xs text-dim">
        <span aria-hidden className="text-[9px]">
          ■
        </span>
        <span className="font-sans">highest month so far</span>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-baseline gap-x-1">
      <span className="inline-flex items-baseline gap-1 font-mono text-xs text-pass">
        <span aria-hidden className="text-[9px]">
          ▼
        </span>
        <span>−{Math.abs(p.relative).toFixed(0)}%</span>
      </span>
      <span className="text-xs text-faint">from the month-{p.peakMonth} peak</span>
    </span>
  );
}

/** Label, big number, change against baseline (or the peak), and the year as a sparkline. */
function SeriesStat({
  label,
  value,
  unit,
  spec,
  month,
  colorClass,
  threshold,
  compare = "baseline",
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  spec: SeriesSpec;
  month: number;
  colorClass: string;
  threshold?: { value: number; label: string };
  /** Spend gadgets compare with the peak so far: their baseline is autocomplete only. */
  compare?: "baseline" | "peak";
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-dim">{label}</div>
          <BigNumber value={value} unit={unit} />
          {compare === "peak" ? <PeakDelta series={spec.series} month={month} /> : <SeriesDelta spec={spec} month={month} />}
        </div>
        <Sparkline series={spec.series} month={month} label={label} colorClass={colorClass} threshold={threshold} />
      </div>
      {children && <div className="border-t border-edge pt-2.5 text-xs text-dim">{children}</div>}
    </div>
  );
}

/** Month numbers under a bar chart, the selected one in bold. */
function MonthAxis({ month }: { month: number }) {
  return (
    <div aria-hidden className="mt-1 flex gap-1 text-center text-[10px] tabular-nums text-faint">
      {ALL_MONTHS.map((m) => (
        <span key={m} className={`flex-1 ${m === month ? "font-bold text-ink" : ""}`}>
          {m}
        </span>
      ))}
    </div>
  );
}

function barOpacity(m: number, month: number): string {
  return m === month ? "" : m < month ? "opacity-60" : "opacity-15";
}

// Shipped this month

const WORK_BG: Record<WorkType, string> = {
  features: "bg-brand",
  fixes: "bg-purple",
  performance: "bg-pass",
  maintenance: "bg-faint",
};

/** Drawn top to bottom in each bar; features sit on top. */
const WORK_STACK: readonly WorkType[] = ["features", "performance", "fixes", "maintenance"];

const SHIPPED_SPEC: SeriesSpec = {
  series: shippedSeries(),
  lowerIsBetter: false,
  tolerance: 3,
  deltaMode: "relative",
  decimals: 0,
};

function Shipped({ month }: GadgetBodyProps) {
  const totals = SHIPPED_SPEC.series;
  const max = Math.max(...totals);
  const total = shippedTotal(month);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-xs font-medium text-dim">Month {month}, tickets live for customers</div>
          <BigNumber value={String(total)} unit="tickets" />
          <SeriesDelta spec={SHIPPED_SPEC} month={month} />
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim" aria-label={`Month ${month} shipped by type`}>
          {WORK_TYPES.map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${WORK_BG[t]}`} />
              {WORK_LABEL[t]} <span className="font-medium tabular-nums text-ink">{SHIPPED[t][month]}</span>
            </li>
          ))}
        </ul>
      </div>
      <div
        role="img"
        aria-label={`Tickets shipped, months 0 to ${month}: ${ALL_MONTHS.slice(0, month + 1)
          .map((m) => `month ${m} ${totals[m]}`)
          .join(", ")}.`}
      >
        <div className="flex h-28 items-end gap-1 border-b border-edge">
          {ALL_MONTHS.map((m) => (
            <div
              key={m}
              title={`Month ${m}: ${totals[m]} shipped`}
              className={`flex flex-1 flex-col overflow-hidden rounded-t-[3px] ${barOpacity(m, month)}`}
              style={{ height: `${((totals[m] ?? 0) / max) * 100}%` }}
            >
              {WORK_STACK.map((t) => (
                <div key={t} className={WORK_BG[t]} style={{ height: `${(SHIPPED[t][m] / (totals[m] || 1)) * 100}%` }} />
              ))}
            </div>
          ))}
        </div>
        <MonthAxis month={month} />
      </div>
    </div>
  );
}

// Request to live

const REQUEST_SPEC: SeriesSpec = {
  series: REQUEST_TO_LIVE_DAYS,
  lowerIsBetter: true,
  tolerance: 0.5,
  deltaMode: "absolute",
  deltaUnit: " days",
  decimals: 1,
};

function RequestToLive({ month }: GadgetBodyProps) {
  const days = valueAt(REQUEST_TO_LIVE_DAYS, month);
  const base = baselineOf(REQUEST_TO_LIVE_DAYS);
  const weeks = days / 7;
  return (
    <SeriesStat
      label="Median, accepted to live, incl. backlog wait"
      value={days.toFixed(1)}
      unit="days"
      spec={REQUEST_SPEC}
      month={month}
      colorClass="text-speed"
    >
      About {weeks.toFixed(1)} weeks · baseline {base.toFixed(0)} days
    </SeriesStat>
  );
}

// Shipped per engineer

const PER_ENGINEER_SPEC: SeriesSpec = {
  series: ALL_MONTHS.map(shippedPerEngineer),
  lowerIsBetter: false,
  tolerance: 0.08,
  deltaMode: "relative",
  decimals: 2,
};

function ShippedPerEngineer({ month }: GadgetBodyProps) {
  return (
    <SeriesStat
      label="Tickets live per engineer"
      value={shippedPerEngineer(month).toFixed(2)}
      unit="/ month"
      spec={PER_ENGINEER_SPEC}
      month={month}
      colorClass="text-speed"
    >
      {shippedTotal(month)} tickets across {ENGINEERS} engineers · baseline {baselineOf(PER_ENGINEER_SPEC.series).toFixed(2)}
    </SeriesStat>
  );
}

// Customer outcomes

const REBOOK_SPEC: SeriesSpec = { series: REBOOK_SUCCESS, lowerIsBetter: false, tolerance: 1, deltaMode: "absolute", deltaUnit: " pts", decimals: 0 };
const CONVERSION_SPEC: SeriesSpec = {
  series: CHECKOUT_CONVERSION,
  lowerIsBetter: false,
  tolerance: 0.03,
  deltaMode: "absolute",
  deltaUnit: " pts",
  decimals: 2,
};

function Outcomes({ month }: GadgetBodyProps) {
  const dup = DUPLICATE_CHARGE_INCIDENTS[month];
  const dupYear = DUPLICATE_CHARGE_INCIDENTS.slice(Math.max(0, month - 11), month + 1).reduce((a, b) => a + b, 0);
  const check = comprehensionAt(month);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SeriesStat
        label="Rebooked within policy, 2 h"
        value={`${REBOOK_SUCCESS[month]}`}
        unit="% of cancellations"
        spec={REBOOK_SPEC}
        month={month}
        colorClass="text-quality"
      />
      <SeriesStat
        label="Checkout conversion"
        value={CHECKOUT_CONVERSION[month].toFixed(2)}
        unit="%"
        spec={CONVERSION_SPEC}
        month={month}
        colorClass="text-quality"
      />
      <div className="flex flex-col gap-1">
        <div className="text-xs font-medium text-dim">Duplicate-charge incidents</div>
        <BigNumber value={`${dup}`} unit="this month" />
        <span className={`text-xs ${dup > 0 ? "text-fail-text" : "text-faint"}`}>
          {dupYear} in the last 12 months{dup > 0 ? " · see BW-311" : ""}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-xs font-medium text-dim">Engineers own agent-written code</div>
        {check ? (
          <>
            <BigNumber value={`${check.passed} of ${check.sessions}`} unit={`checks, month ${check.month}`} />
            <span className="text-xs text-faint">{check.note}</span>
          </>
        ) : (
          <span className="text-xs text-faint">First quarterly check in month 3.</span>
        )}
      </div>
    </div>
  );
}

// AI cost per booking

const COST_PER_BOOKING = ALL_MONTHS.map((m) => monthlySpend(m) / SUCCESSFUL_BOOKINGS[m]);
const COST_PER_BOOKING_SPEC: SeriesSpec = {
  series: COST_PER_BOOKING,
  lowerIsBetter: true,
  tolerance: 0.005,
  deltaMode: "absolute",
  decimals: 3,
  prefix: "$",
};

function CostPerBooking({ month }: GadgetBodyProps) {
  return (
    <SeriesStat
      label="AI spend per completed booking"
      value={`$${COST_PER_BOOKING[month].toFixed(3)}`}
      spec={COST_PER_BOOKING_SPEC}
      month={month}
      colorClass="text-system"
      compare="peak"
    >
      {SUCCESSFUL_BOOKINGS[month].toLocaleString("en-US")} bookings this month
    </SeriesStat>
  );
}

// AI spend vs budget

function AiBudget({ month }: GadgetBodyProps) {
  const spends = spendSeries();
  const max = Math.max(...spends, ...AI_BUDGET);
  const now = budgetCheck(month);
  const ytd = budgetToDate(month);
  const usedPct = Math.round(now.usedShare * 100);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-xs font-medium text-dim">Month {month} AI spend</div>
          <BigNumber value={formatDollars(now.spend)} unit={`of ${formatDollars(now.budget)} budget`} />
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-dim">
            <Lozenge tone={now.over ? "fail" : "pass"}>
              {now.over ? "Over" : "Under"} by {formatDollars(Math.abs(now.diff))}
            </Lozenge>
            <span>{usedPct}% of budget used</span>
          </div>
        </div>
        <div className="text-xs text-dim">
          <div className="font-medium">Year to date</div>
          <div className="tabular-nums">
            <span className="font-semibold text-ink">{formatDollars(ytd.spend)}</span> of {formatDollars(ytd.budget)}
          </div>
        </div>
      </div>
      <div
        role="img"
        aria-label={`AI spend against budget, months 0 to ${month}: ${ALL_MONTHS.slice(0, month + 1)
          .map((m) => `month ${m} ${formatDollars(spends[m] ?? 0)} of ${formatDollars(AI_BUDGET[m] ?? 0)}`)
          .join(", ")}.`}
      >
        <div className="flex h-28 items-end gap-1 border-b border-edge">
          {ALL_MONTHS.map((m) => {
            const spend = spends[m] ?? 0;
            const budget = AI_BUDGET[m] ?? 0;
            const over = spend > budget;
            return (
              <div
                key={m}
                title={`Month ${m}: ${formatDollars(spend)} of ${formatDollars(budget)} budget`}
                className={`relative h-full flex-1 ${barOpacity(m, month)}`}
              >
                <div
                  className={`absolute inset-x-0 bottom-0 rounded-t-[3px] ${over ? "bg-fail" : "bg-medium"}`}
                  style={{ height: `${(spend / max) * 100}%` }}
                />
                <div className="absolute -inset-x-0.5 h-0.5 bg-ink" style={{ bottom: `${(budget / max) * 100}%` }} />
              </div>
            );
          })}
        </div>
        <MonthAxis month={month} />
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim">
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-medium" />
          Spend
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-3 bg-ink" />
          Budget
        </li>
      </ul>
    </div>
  );
}

// Cost per shipped ticket

const COST_PER_TICKET_SPEC: SeriesSpec = {
  series: ALL_MONTHS.map(costPerShipped),
  lowerIsBetter: true,
  tolerance: 5,
  deltaMode: "absolute",
  decimals: 0,
  prefix: "$",
};

function CostPerTicket({ month }: GadgetBodyProps) {
  const p = fromPeak(COST_PER_TICKET_SPEC.series, month);
  return (
    <SeriesStat
      label="AI spend per shipped ticket"
      value={formatDollars(costPerShipped(month))}
      unit="/ ticket"
      spec={COST_PER_TICKET_SPEC}
      month={month}
      colorClass="text-medium"
      compare="peak"
    >
      {formatDollars(monthlySpend(month))} over {shippedTotal(month)} tickets
      {p && !p.atPeak && <> · peak {formatDollars(p.peak)} in month {p.peakMonth}</>}
    </SeriesStat>
  );
}

// Spend by team

function SpendByTeam({ month }: GadgetBodyProps) {
  const rows = spendByTeam(month);
  const max = Math.max(...rows.map((r) => r.spend)) || 1;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-dim">Month {month} AI spend</div>
        <BigNumber value={formatDollars(monthlySpend(month))} unit="across 6 teams" />
      </div>
      <ul className="flex flex-col gap-2" aria-label={`Month ${month} AI spend by team`}>
        {rows.map((r) => {
          const inRollout = month >= r.joined;
          return (
            <li key={r.id} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-sm">
              <span className="truncate" title={`${r.name}: ${r.engineers} engineers, joined month ${r.joined}`}>
                {r.name}
              </span>
              <span className="h-2.5 overflow-hidden rounded-full bg-neutral-bg" aria-hidden>
                <span
                  className={`block h-full rounded-full ${inRollout ? "bg-brand" : "bg-faint"}`}
                  style={{ width: `${(r.spend / max) * 100}%` }}
                />
              </span>
              <span className="whitespace-nowrap text-right text-xs tabular-nums">
                <span className="font-medium text-ink">{formatDollars(r.spend)}</span>{" "}
                <span className="text-faint">{Math.round(r.share * 100)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
      {rows.some((r) => month < r.joined) && (
        <p className="border-t border-edge pt-2.5 text-xs text-dim">
          Grey: not yet in the rollout ({rows
            .filter((r) => month < r.joined)
            .map((r) => `${r.name} joins month ${r.joined}`)
            .join(", ")}); editor autocomplete only.
        </p>
      )}
    </div>
  );
}

// Share of payroll

const PAYROLL_SPEC: SeriesSpec = {
  series: ALL_MONTHS.map(payrollShare),
  lowerIsBetter: true,
  tolerance: 0.1,
  deltaMode: "absolute",
  deltaUnit: " pts",
  decimals: 2,
};

function PayrollShare({ month }: GadgetBodyProps) {
  const share = payrollShare(month);
  const payrollPerEngineer = PAYROLL_PER_MONTH / ENGINEERS;
  return (
    <SeriesStat
      label="AI spend as a share of payroll"
      value={`${share.toFixed(2)}%`}
      spec={PAYROLL_SPEC}
      month={month}
      colorClass="text-medium"
      compare="peak"
    >
      {formatDollars(monthlySpend(month))} of {formatDollars(PAYROLL_PER_MONTH)} monthly engineering payroll ·{" "}
      {formatDollars(spendPerEngineer(month))} per engineer against {formatDollars(payrollPerEngineer)}
    </SeriesStat>
  );
}

// Forecast next quarter

function Forecast({ month }: GadgetBodyProps) {
  const f = forecastQuarter(month);
  const [first, , last] = f.months;
  const scaleMax = Math.max(f.high, f.budget ?? 0) * 1.05 || 1;
  const pos = (v: number) => `${(v / scaleMax) * 100}%`;
  const verdict =
    f.budget === null
      ? null
      : f.high <= f.budget
        ? { tone: "pass" as const, text: "Within budget" }
        : f.low > f.budget
          ? { tone: "fail" as const, text: "Above budget" }
          : { tone: "warn" as const, text: "Near budget" };
  const trendWord = f.slope < 0 ? "falling" : f.slope > 0 ? "rising" : "flat";
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-dim">
          AI spend, months {first}–{last}
        </div>
        <span className="text-[24px] font-semibold leading-8 tabular-nums">
          {formatDollars(f.low, true)} – {formatDollars(f.high, true)}
        </span>
        <div className="text-xs text-faint">
          Trend {formatDollars(f.central, true)} · flat {formatDollars(f.flat, true)}
        </div>
      </div>
      <div
        role="img"
        aria-label={`Projected range ${formatDollars(f.low)} to ${formatDollars(f.high)}${
          f.budget === null ? "" : `, against a budget of ${formatDollars(f.budget)}`
        }.`}
        className="relative h-6"
      >
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-neutral-bg" />
        <div
          className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-medium opacity-60"
          style={{ left: pos(f.low), width: `${((f.high - f.low) / scaleMax) * 100}%` }}
        />
        <div className="absolute top-0 h-6 w-0.5 bg-medium" style={{ left: pos(f.central) }} />
        {f.budget !== null && <div className="absolute top-0 h-6 w-0.5 bg-ink" style={{ left: pos(f.budget) }} />}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-edge pt-2.5 text-xs text-dim">
        {verdict ? (
          <>
            <Lozenge tone={verdict.tone}>{verdict.text}</Lozenge>
            <span>Budget {formatDollars(f.budget ?? 0, true)} for those months</span>
          </>
        ) : (
          <span>No budget agreed yet for months {first}–{last}</span>
        )}
        <span className="basis-full">
          Last 3 months: spend {trendWord}
          {f.slope !== 0 && ` ${formatDollars(Math.abs(f.slope), true)} a month`}
        </span>
      </div>
    </div>
  );
}

// Uptime and incidents

const INCIDENT_SPEC: SeriesSpec = {
  series: incidentSeries(),
  lowerIsBetter: true,
  tolerance: 1,
  deltaMode: "absolute",
  decimals: 0,
};

const SEVERITY_TONE = { sev1: "fail", sev2: "warn", sev3: "neutral" } as const;

function Risk({ month }: GadgetBodyProps) {
  const uptime = metricById("uptime");
  const v = valueAt(uptime.series, month);
  const within = v >= SLO;
  const inc = incidentsAt(month);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <MetricStat id="uptime" month={month} colorClass="text-quality" label="Uptime, trailing 30 days" />
        <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
          <Lozenge tone={within ? "pass" : "fail"}>{within ? "Within SLO" : "Below SLO"}</Lozenge>
          <span>SLO {SLO}%</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-edge pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
        <div className="text-xs font-medium text-dim">Customer-facing bugs this month</div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <BigNumber value={String(inc.total)} />
          <SeriesDelta spec={INCIDENT_SPEC} month={month} />
        </div>
        <ul className="divide-y divide-edge">
          {SEVERITIES.map((s) => (
            <li key={s} className="flex items-center justify-between gap-2 py-1 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Lozenge tone={inc[s] > 0 ? SEVERITY_TONE[s] : "neutral"}>{s.replace("sev", "Sev ")}</Lozenge>
                <span className="truncate text-xs text-dim">{SEVERITY_LABEL[s].replace(/^Sev \d /, "")}</span>
              </span>
              <span className="whitespace-nowrap text-xs tabular-nums">
                <span className="font-semibold text-ink">{inc[s]}</span>{" "}
                <span className="text-faint">baseline {baselineOf(ESCAPED_BY_SEVERITY[s])}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export const GADGET_BODIES: Record<GadgetId, (props: GadgetBodyProps) => React.ReactNode> = {
  shipped: Shipped,
  outcomes: Outcomes,
  costPerBooking: CostPerBooking,
  requestToLive: RequestToLive,
  shippedPerEngineer: ShippedPerEngineer,
  aiBudget: AiBudget,
  costPerTicket: CostPerTicket,
  spendByTeam: SpendByTeam,
  payrollShare: PayrollShare,
  forecast: Forecast,
  risk: Risk,
  tokenSpend: TokenSpend,
  velocity: Velocity,
  cycleTime: CycleTime,
  release: Release,
  health: Health,
  errorBudget: ErrorBudgetGadget,
  adoption: Adoption,
  rules: Rules,
  evals: Evals,
  costPerChange: CostPerChange,
  phase: Phase,
  tickets: Tickets,
};

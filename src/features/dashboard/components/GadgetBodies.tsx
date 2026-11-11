import { LAST_MONTH, MONTHS, PAIRS, PHASES, RULES, type TierShare } from "@/features/metrics/data";
import {
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
import { errorBudget, formatDollars, spendByTier } from "../derive";
import type { GadgetId } from "../gadgets";

const M = LAST_MONTH;

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

/** Number with its prefix big and its unit small, e.g. "36" + "/ team / wk". */
function Value({ id, size = "lg" }: { id: string; size?: "lg" | "md" }) {
  const m = metricById(id);
  const v = valueAt(m.series, M);
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

function Delta({ id }: { id: string }) {
  const m = metricById(id);
  const d = deltaVsBaseline(m, M);
  return (
    <span className="flex flex-wrap items-baseline gap-x-1">
      <DeltaText delta={d} text={formatDelta(m, d)} />
      <span className="text-xs text-faint">vs baseline</span>
    </span>
  );
}

function Spark({ id, colorClass }: { id: string; colorClass: string }) {
  const m = metricById(id);
  return <Sparkline series={m.series} month={M} label={m.short} colorClass={colorClass} threshold={m.threshold} />;
}

/** One metric: label, number, change against baseline, and its year as a sparkline. */
function MetricStat({ id, colorClass, size = "lg", label }: { id: string; colorClass: string; size?: "lg" | "md"; label?: string }) {
  const m = metricById(id);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-dim">{label ?? m.short}</div>
        <Value id={id} size={size} />
        <Delta id={id} />
      </div>
      <Spark id={id} colorClass={colorClass} />
    </div>
  );
}

// 1. Token spend

const TIERS: readonly { key: keyof TierShare; label: string; bg: string }[] = [
  { key: "large", label: "Large", bg: "bg-large" },
  { key: "medium", label: "Medium", bg: "bg-medium" },
  { key: "small", label: "Small", bg: "bg-small" },
];

function TokenSpend() {
  const months = Array.from({ length: MONTHS - 1 }, (_, i) => i + 1);
  const spends = months.map((m) => ({ month: m, ...spendByTier(m) }));
  const max = Math.max(...spends.map((s) => s.total));
  const now = spendByTier(M);
  const peak = spends.reduce((a, b) => (b.total > a.total ? b : a));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-xs font-medium text-dim">Month {M} spend</div>
          <span className="text-[28px] font-semibold leading-8 tabular-nums">{formatDollars(now.total)}</span>
          <span className="ml-1 text-xs text-dim">/ month</span>
          <div className="text-xs text-faint">
            Peak {formatDollars(peak.total)} in month {peak.month}
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim" aria-label={`Month ${M} spend by model size`}>
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
        aria-label={`Monthly AI spend, months 1 to ${M}: ${spends.map((s) => `month ${s.month} ${formatDollars(s.total)}`).join(", ")}.`}
      >
        <div className="flex h-28 items-end gap-1 border-b border-edge">
          {spends.map((s) => (
            <div
              key={s.month}
              title={`Month ${s.month}: ${formatDollars(s.total)}`}
              className={`flex flex-1 flex-col overflow-hidden rounded-t-[3px] ${s.month === M ? "" : "opacity-60"}`}
              style={{ height: `${(s.total / max) * 100}%` }}
            >
              {TIERS.map((t) => (
                <div key={t.key} className={t.bg} style={{ height: `${(s[t.key] / s.total) * 100}%` }} />
              ))}
            </div>
          ))}
        </div>
        <div aria-hidden className="mt-1 flex gap-1 text-center text-[10px] tabular-nums text-faint">
          {spends.map((s) => (
            <span key={s.month} className={`flex-1 ${s.month === M ? "font-bold text-ink" : ""}`}>
              {s.month}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// 4. Deploys and change failures

function Release() {
  const deploys = metricById("deployFreq");
  const cfr = metricById("cfr");
  const { verdict, reason } = pairVerdict(deploys, cfr, M);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {[deploys, cfr].map((m) => (
          <div key={m.id} className="min-w-0">
            <div className="truncate text-xs font-medium text-dim">{m.short}</div>
            <Value id={m.id} size="md" />
            <Delta id={m.id} />
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

// 6. Delivery health

function Health() {
  const rows = PAIRS.map((p) => {
    const speed = metricById(p.speed);
    const quality = metricById(p.quality);
    return { id: p.id, speed, quality, ...pairVerdict(speed, quality, M) };
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
    </div>
  );
}

// 5. Uptime and error budget

function ErrorBudgetGadget() {
  const uptime = metricById("uptime");
  const b = errorBudget(valueAt(uptime.series, M));
  const pct = Math.round(b.leftShare * 100);
  const tone = b.leftShare > 0.5 ? "pass" : b.leftShare > 0.2 ? "warn" : "fail";
  const bar = { pass: "bg-pass", warn: "bg-warn", fail: "bg-fail" }[tone];
  const word = { pass: "Healthy", warn: "Low", fail: "Nearly spent" }[tone];
  return (
    <div className="flex flex-col gap-3">
      <MetricStat id="uptime" colorClass="text-quality" label="Uptime, last 30 days" />
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

// 7. AI adoption

function Adoption() {
  return (
    <div className="flex flex-col gap-3">
      <MetricStat id="agentShare" colorClass="text-speed" label="Agent-authored share of merged code" />
      <div className="border-t border-edge pt-3">
        <MetricStat id="rework" colorClass="text-quality" size="md" label="Rework rate, agent code" />
      </div>
    </div>
  );
}

// 8. Eval pass rate

function Evals() {
  const m = metricById("evalPass");
  const v = valueAt(m.series, M);
  const threshold = m.threshold?.value ?? 92;
  const above = v >= threshold;
  return (
    <div className="flex flex-col gap-3">
      <MetricStat id="evalPass" colorClass="text-quality" />
      <div className="flex items-center gap-2 border-t border-edge pt-2.5 text-xs text-dim">
        <Lozenge tone={above ? "pass" : "fail"}>{above ? "Release open" : "Release blocked"}</Lozenge>
        <span>
          Threshold {threshold}% · {Math.abs(v - threshold).toFixed(0)} pts {above ? "above" : "below"}
        </span>
      </div>
    </div>
  );
}

// 9. Decision rules

function statusLozenge(s: RuleStatus) {
  if (s.state === "active") return <Lozenge tone="fail">Firing</Lozenge>;
  if (s.state === "cleared") return <Lozenge tone="pass">Cleared m{s.clearedAt}</Lozenge>;
  return <Lozenge tone="neutral">Not fired</Lozenge>;
}

function Rules() {
  const rows = RULES.map((r) => ({ rule: r, status: ruleStatus(r, M) }));
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

// 10. Cost per change

function CostPerChange() {
  return (
    <div className="flex flex-col gap-3">
      <MetricStat id="spend" colorClass="text-medium" label="AI spend per merged change" />
      <div className="border-t border-edge pt-3">
        <MetricStat id="cacheHit" colorClass="text-small" size="md" label="Prompt-cache hit rate" />
      </div>
    </div>
  );
}

// 11. Rollout phase

function Phase() {
  const current = phaseFor(M);
  const pct = Math.round((M / LAST_MONTH) * 100);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-dim">Current phase</div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold leading-7">{current.name}</span>
          <Lozenge tone="info">In progress</Lozenge>
        </div>
        <div className="text-xs text-faint">
          Month {M} of {LAST_MONTH} · {pct}% through the year
        </div>
      </div>
      <div className="flex gap-1" aria-hidden>
        {PHASES.map((p) => (
          <div key={p.id} className="min-w-0" style={{ flex: p.end - p.start + 1 }}>
            <div
              className={`h-2 rounded-full ${p.id === current.id ? "bg-brand" : p.end < M ? "bg-pass" : "bg-neutral-bg"}`}
            />
          </div>
        ))}
      </div>
      <ul className="space-y-1 text-sm">
        {PHASES.map((p) => {
          const done = p.end < M;
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

// 12. Sample tickets

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

const KIND_TONE: Record<string, Tone> = { feature: "pass", bug: "fail", performance: "purple" };

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

function Velocity() {
  return <MetricStat id="throughput" colorClass="text-speed" label="Merged changes per team per week" />;
}

function CycleTime() {
  return <MetricStat id="cycleTime" colorClass="text-speed" label="Median, first commit to production" />;
}

export const GADGET_BODIES: Record<GadgetId, () => React.ReactNode> = {
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

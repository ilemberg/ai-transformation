import { RULES, SIGNALS, type Rule } from "../data";
import { baselineOf, formatValue, lookupSeries, metricById, ruleStatus, valueAt, type RuleStatus } from "../logic";
import { SectionHeading } from "./ui";

/** The reading the rule looks at, as of the selected month. */
function reading(rule: Rule, month: number): string {
  const t = rule.test;
  switch (t.kind) {
    case "aboveBaseline": {
      const m = metricById(t.metric);
      return `Now ${formatValue(m, valueAt(m.series, month))}, baseline ${formatValue(m, baselineOf(m.series))}`;
    }
    case "above":
    case "below": {
      if (t.series === "perPersonViews") {
        const n = valueAt(SIGNALS.perPersonViews, month);
        return `${n} report${n === 1 ? "" : "s"} slice a metric by person`;
      }
      const m = metricById(t.series);
      return `Now ${formatValue(m, valueAt(m.series, month))}, limit ${formatValue(m, t.threshold)}`;
    }
    case "aboveSeries": {
      const m = metricById(t.series);
      return `Agent code ${formatValue(m, valueAt(m.series, month))}, human code ${formatValue(m, valueAt(lookupSeries(t.other), month))}`;
    }
  }
}

function StatusBadge({ status }: { status: RuleStatus }) {
  if (status.state === "idle") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-edge-2 px-2.5 py-0.5 text-xs text-dim">
        <span aria-hidden>○</span> Idle
      </span>
    );
  }
  if (status.state === "active") {
    return (
      <span className="relative inline-flex items-center gap-1.5 rounded-full border border-fail/50 bg-fail/15 px-2.5 py-0.5 text-xs font-semibold text-fail">
        <span aria-hidden className="relative flex h-2 w-2">
          <span className="pulse-ring absolute inset-0 rounded-full bg-fail" />
          <span className="relative h-2 w-2 rounded-full bg-fail" />
        </span>
        Firing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 text-xs font-semibold text-warn">
      <span aria-hidden>✓</span> Fired, cleared
    </span>
  );
}

function statusLine(status: RuleStatus, month: number): string {
  if (status.state === "idle") return month === 0 ? "Not fired." : `Not fired in months 0–${month}.`;
  if (status.state === "active") {
    return status.since === status.firstFired
      ? `Fired at month ${status.firstFired}; still firing.`
      : `First fired at month ${status.firstFired}; firing again since month ${status.since}.`;
  }
  return `Fired at month ${status.firstFired}; cleared at month ${status.clearedAt}.`;
}

export function RulesPanel({ month }: { month: number }) {
  return (
    <section aria-labelledby="rules-heading">
      <SectionHeading id="rules-heading" kicker="Agreed in advance" title="Decision rules">
        Written down before the pilot, so nobody argues about what a bad number means while it is happening. Each
        status below is worked out from the data for the month selected. The rules run weekly in practice; this page
        checks each month&apos;s reading.
      </SectionHeading>
      <ol className="grid gap-3 lg:grid-cols-2">
        {RULES.map((rule) => {
          const status = ruleStatus(rule, month);
          const fired = status.state !== "idle";
          return (
            <li
              key={rule.id}
              className={`rounded-md border p-4 motion-safe:transition-colors motion-safe:duration-500 ${
                status.state === "active"
                  ? "border-fail/50 bg-fail/[0.06]"
                  : status.state === "cleared"
                    ? "border-warn/30 bg-panel"
                    : "border-edge bg-panel"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug">
                  <span className="text-faint">If </span>
                  {rule.when.charAt(0).toLowerCase() + rule.when.slice(1)}
                </p>
                <StatusBadge status={status} />
              </div>
              <p className="mt-1.5 text-sm text-dim">
                <span aria-hidden className="text-faint">
                  →{" "}
                </span>
                <span className="sr-only">then </span>
                {rule.then}
              </p>
              <p className="mt-3 font-mono text-xs text-faint">{reading(rule, month)}</p>
              <p className={`mt-1 text-xs ${fired ? "text-ink" : "text-faint"}`}>
                {statusLine(status, month)}
                {fired && <span className="text-dim"> {rule.response}</span>}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

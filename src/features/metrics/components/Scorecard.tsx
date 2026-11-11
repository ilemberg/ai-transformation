import { GROUPS, METRICS } from "../data";
import { baselineOf, deltaVsBaseline, formatDelta, formatTarget, formatValue, meetsTarget, valueAt } from "../logic";
import { DeltaText, KindTag, SectionHeading } from "./ui";

function Status({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="text-faint">No target</span>;
  return ok ? (
    <span className="inline-flex items-center gap-1 text-pass">
      <span aria-hidden>✓</span> On target
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-fail">
      <span aria-hidden>✕</span> Off target
    </span>
  );
}

export function Scorecard({ month }: { month: number }) {
  const onTarget = METRICS.filter((m) => meetsTarget(m.target, valueAt(m.series, month))).length;
  return (
    <section aria-labelledby="scorecard-heading">
      <SectionHeading id="scorecard-heading" kicker="Every number" title="The full scorecard">
        {METRICS.length} metrics in five groups, reported per team and rolled up, never per person. At month {month},{" "}
        <span className="text-ink">
          {onTarget} of {METRICS.length}
        </span>{" "}
        are on target.
      </SectionHeading>
      <div className="overflow-x-auto rounded-xl border border-edge bg-panel" tabIndex={0} role="region" aria-labelledby="scorecard-heading">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <caption className="sr-only">Scorecard at month {month}: baseline, current value, target and status for each metric</caption>
          <thead>
            <tr className="border-b border-edge text-xs text-faint">
              <th scope="col" className="px-4 py-3 font-medium">Metric</th>
              <th scope="col" className="px-4 py-3 font-medium">Definition</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Baseline</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Month {month}</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Target</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          {GROUPS.map((group) => (
            <tbody key={group.id}>
              <tr className="bg-panel-2/70">
                <th scope="colgroup" colSpan={6} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-dim">
                  {group.label}
                  {group.note && <span className="ml-2 font-normal normal-case tracking-normal text-faint">{group.note}</span>}
                </th>
              </tr>
              {METRICS.filter((m) => m.group === group.id).map((m) => {
                const value = valueAt(m.series, month);
                const delta = deltaVsBaseline(m, month);
                return (
                  <tr key={m.id} className="border-t border-edge/70 align-top">
                    <th scope="row" className="px-4 py-3 font-medium">
                      <div className="flex flex-col items-start gap-1">
                        <span>{m.name}</span>
                        {m.kind !== "other" && <KindTag kind={m.kind} />}
                      </div>
                    </th>
                    <td className="max-w-[300px] px-4 py-3 text-xs leading-relaxed text-dim">{m.definition}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-dim">
                      {formatValue(m, baselineOf(m.series))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="font-mono font-semibold tabular-nums">{formatValue(m, value)}</div>
                      <DeltaText delta={delta} text={formatDelta(m, delta)} className="mt-0.5" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-dim">{formatTarget(m)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-medium">
                      <Status ok={meetsTarget(m.target, value)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <p className="mt-2 text-xs text-faint sm:hidden">Scroll the table sideways to see every column.</p>
      <TierNote />
    </section>
  );
}

function TierNote() {
  return (
    <p className="mt-3 text-xs text-faint">
      Share of tokens by model tier belongs to the cost group too. It is charted in the cost section above rather than
      given a single target, because the right mix depends on the work.
    </p>
  );
}

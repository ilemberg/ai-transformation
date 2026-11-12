import { Lozenge, type LozengeTone } from "@/features/line/components/jira";
import { COMPREHENSION, COMPREHENSION_HISTORY, COMPREHENSION_QUARTER, MONTHLY_SWEEPS, SWEEP_LOG, SWEEP_RULE, type SweepEntry } from "../data";
import { formatDate } from "../logic";
import { Result, Scroller, SubHeading, TD, TH, THEAD } from "./ui";

const ACTION_TONE: Record<SweepEntry["action"], LozengeTone> = { Removed: "neutral", Updated: "info", Open: "warning" };

function WeeklySweep() {
  return (
    <div>
      <SubHeading>Weekly: obsolete instructions</SubHeading>
      <p className="mb-2 text-xs text-dim">{SWEEP_RULE}</p>
      <ol className="divide-y divide-edge rounded-md border border-edge bg-card text-sm">
        {SWEEP_LOG.map((s) => (
          <li key={s.id} id={s.id} className="scroll-mt-20 px-3 py-2 target:bg-selected">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-xs tabular-nums text-dim">{formatDate(s.date)}</span>
              <Lozenge tone={ACTION_TONE[s.action]}>{s.action}</Lozenge>
              <span className="font-mono text-[13px]">{s.item}</span>
            </div>
            <p className="mt-0.5 text-xs text-dim">{s.reason}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MonthlySweep() {
  return (
    <div>
      <SubHeading>Monthly: architecture and code quality</SubHeading>
      <Scroller label="Monthly sweeps" className="bg-card">
        <table className="w-full text-sm">
          <thead className={THEAD}>
            <tr>
              <th className={TH}>Month</th>
              <th className={`${TH} text-right`}>Dead code removed</th>
              <th className={`${TH} text-right`}>Helpers merged</th>
              <th className={`${TH} text-right`}>Flaky tests fixed</th>
            </tr>
          </thead>
          <tbody>
            {MONTHLY_SWEEPS.map((m) => (
              <tr key={m.month} className="border-b border-edge last:border-0">
                <td className={TD}>{m.month}</td>
                <td className={`${TD} text-right tabular-nums`}>{m.deadLines.toLocaleString("en-US")} lines</td>
                <td className={`${TD} text-right tabular-nums`}>{m.helpersMerged}</td>
                <td className={`${TD} text-right tabular-nums`}>{m.flakyFixed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroller>
    </div>
  );
}

function Comprehension() {
  const now = COMPREHENSION_HISTORY.at(-1)!;
  return (
    <div>
      <SubHeading>Quarterly: agent-written code, explained and changed without the agent</SubHeading>
      <div className="mb-2 flex flex-wrap gap-2">
        {COMPREHENSION_HISTORY.map((q) => (
          <span key={q.quarter} className={`rounded-[3px] border px-2 py-1 text-xs tabular-nums ${q === now ? "border-brand bg-selected" : "border-edge bg-card text-dim"}`}>
            {q.quarter}: <span className="font-semibold">{q.passed} of {q.total}</span> passed
          </span>
        ))}
      </div>
      <ul className="grid gap-x-4 rounded-md border border-edge bg-card px-3 py-1 text-sm sm:grid-cols-2" aria-label={`${COMPREHENSION_QUARTER} sessions`}>
        {COMPREHENSION.map((s) => (
          <li key={s.module} className={`min-w-0 border-b border-edge py-1.5 last:border-0 ${s.note ? "sm:col-span-2" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-[13px]">{s.module}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-faint">{s.team}</span>
                <Result pass={s.passed} />
              </span>
            </div>
            {s.note && <p className="mt-0.5 text-xs text-fail-text">{s.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Cleanup() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklySweep />
        <MonthlySweep />
      </div>
      <Comprehension />
    </div>
  );
}

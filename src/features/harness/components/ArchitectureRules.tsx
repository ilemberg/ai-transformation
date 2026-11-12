import { Lozenge } from "@/features/line/components/jira";
import { ARCH_MONTH, ARCH_RULES } from "../data";
import { formatDate } from "../logic";
import { Scroller, TD, TH, THEAD, TicketLink } from "./ui";

export function ArchitectureRules() {
  const blocked = ARCH_RULES.reduce((s, r) => s + r.blocked, 0);
  return (
    <div>
      <p className="mb-2 text-sm text-dim">
        Checked in CI on every change. Blocked in {ARCH_MONTH}: <span className="font-semibold tabular-nums text-ink">{blocked}</span>
      </p>

      <ul className="space-y-2 sm:hidden" aria-label="Architecture rules">
        {ARCH_RULES.map((r) => (
          <li key={r.id} className="min-w-0 rounded-md border border-edge bg-card p-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-faint">{r.id}</span>
              <Lozenge tone="neutral">{r.check}</Lozenge>
            </div>
            <p className="mt-1 font-medium">{r.rule}</p>
            <p className="mt-1 text-xs tabular-nums text-dim">
              {r.blocked} blocked · changed {formatDate(r.changed)} {r.ticket && <TicketLink ticket={r.ticket} />}
            </p>
            <p className="mt-0.5 text-xs text-dim">{r.why}</p>
          </li>
        ))}
      </ul>

      <Scroller label="Architecture rules" className="hidden bg-card sm:block">
        <table className="w-full text-sm">
          <thead className={THEAD}>
            <tr>
              <th className={TH}>Rule</th>
              <th className={TH}>Checked by</th>
              <th className={`${TH} text-right`}>Blocked</th>
              <th className={TH}>Last change and why</th>
            </tr>
          </thead>
          <tbody>
            {ARCH_RULES.map((r) => (
              <tr key={r.id} className="border-b border-edge align-top last:border-0">
                <td className={`${TD} min-w-56`}>
                  <span className="mr-1.5 font-mono text-xs text-faint">{r.id}</span>
                  {r.rule}
                </td>
                <td className={TD}>
                  <Lozenge tone="neutral">{r.check}</Lozenge>
                </td>
                <td className={`${TD} text-right font-semibold tabular-nums`}>{r.blocked}</td>
                <td className={`${TD} min-w-56 text-dim`}>
                  <span className="whitespace-nowrap tabular-nums text-ink">{formatDate(r.changed)}</span>{" "}
                  {r.ticket && <TicketLink ticket={r.ticket} />}
                  <div className="text-xs">{r.why}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroller>
    </div>
  );
}

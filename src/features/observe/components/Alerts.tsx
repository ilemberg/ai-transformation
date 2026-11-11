import Link from "next/link";
import { Lozenge } from "@/features/line/components/jira";
import { ALERTS, ALERTS_NOW, INCIDENT, traceHref, type TimelineEvent } from "../data";
import { alertStats, minutesBetween } from "../logic";
import { Scroller, Stat, TD, TH } from "./ui";

const DOT: Record<TimelineEvent["tone"], string> = {
  neutral: "bg-system",
  fail: "bg-fail",
  warn: "bg-warn",
  pass: "bg-pass",
  info: "bg-brand",
};

function TraceLink({ id }: { id: string }) {
  return (
    <Link href={traceHref(id)} className="font-mono text-xs text-brand hover:underline">
      {id}
    </Link>
  );
}

export function Alerts() {
  const s = alertStats(ALERTS, ALERTS_NOW);
  const restore = minutesBetween(INCIDENT.impactStart, INCIDENT.restored);

  return (
    <div>
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Pages, last 7 days" value={s.pages} wrap />
        <Stat label="Pages actionable" value={`${Math.round(s.actionablePct)}%`} tone={s.actionablePct < 70 ? "warn" : "pass"} wrap />
        <Stat label="Median time to acknowledge" value={`${s.medianAckMinutes} min`} wrap />
      </dl>

      <ul className="mt-4 space-y-2 sm:hidden" aria-label="Recent alerts">
        {ALERTS.map((a) => (
          <li key={a.id} className="min-w-0 rounded-md border border-edge bg-card p-2.5 text-sm">
            <p className="break-words font-mono text-xs font-medium">{a.name}</p>
            <p className="mt-0.5 text-xs text-dim">{a.note}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <Lozenge tone={a.severity === "page" ? "danger" : "neutral"}>{a.severity === "page" ? "Page" : "Ticket"}</Lozenge>
              <span className="text-dim">{a.service}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="tabular-nums">{a.fired}</span>
              <span className="tabular-nums">
                <span className="text-faint">Ack </span>
                {a.ackMinutes} min
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-faint">Actionable</span>
                <Lozenge tone={a.actionable ? "success" : "warning"}>{a.actionable ? "Yes" : "No"}</Lozenge>
              </span>
              {a.ticket && <span className="font-medium text-brand">{a.ticket}</span>}
              {a.trace && <TraceLink id={a.trace} />}
            </div>
          </li>
        ))}
      </ul>

      <Scroller label="Recent alerts, scrolls sideways" className="mt-4 hidden sm:block">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <caption className="sr-only">Recent alerts: name, service, severity, when fired, time to acknowledge, whether it was actionable, and the linked ticket.</caption>
          <thead className="bg-panel-2 text-xs text-dim">
            <tr>
              <th scope="col" className={TH}>Alert</th>
              <th scope="col" className={TH}>Service</th>
              <th scope="col" className={TH}>Severity</th>
              <th scope="col" className={TH}>Fired</th>
              <th scope="col" className={`${TH} text-right`}>Acknowledged in</th>
              <th scope="col" className={TH}>Actionable</th>
              <th scope="col" className={TH}>Ticket</th>
            </tr>
          </thead>
          <tbody>
            {ALERTS.map((a) => (
              <tr key={a.id} className="border-t border-edge align-top hover:bg-hover">
                <th scope="row" className="px-3 py-2 font-normal">
                  <span className="font-mono text-xs">{a.name}</span>
                  <span className="mt-0.5 block text-xs text-dim">{a.note}</span>
                </th>
                <td className={`${TD} text-dim`}>{a.service}</td>
                <td className={TD}>
                  <Lozenge tone={a.severity === "page" ? "danger" : "neutral"}>{a.severity === "page" ? "Page" : "Ticket"}</Lozenge>
                </td>
                <td className={`${TD} tabular-nums`}>{a.fired}</td>
                <td className={`${TD} text-right tabular-nums`}>{a.ackMinutes} min</td>
                <td className={TD}>
                  <Lozenge tone={a.actionable ? "success" : "warning"}>{a.actionable ? "Yes" : "No"}</Lozenge>
                </td>
                <td className={TD}>
                  {a.ticket ? <span className="font-medium text-brand">{a.ticket}</span> : <span className="text-faint">–</span>}
                  {a.trace && (
                    <span className="ml-2">
                      <TraceLink id={a.trace} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scroller>

      <div className="mt-5 rounded-md border border-edge bg-card p-4">
        <h3 className="flex flex-wrap items-center gap-2 font-semibold">
          <Lozenge tone="danger">P1</Lozenge>
          <span className="text-brand">{INCIDENT.ticket}</span>
          <span>{INCIDENT.title}</span>
        </h3>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Time to restore" value={`${restore} min`} wrap />
          <Stat label="Time to fix in production" value={INCIDENT.timeToFix} wrap />
          <Stat label="Customers affected" value={INCIDENT.customers} wrap />
        </dl>
        <ol className="mt-4 border-l-2 border-edge pl-4" aria-label={`${INCIDENT.ticket} timeline, Mon 9 Nov 2026`}>
          {INCIDENT.events.map((e) => (
            <li key={e.at + e.text} className="relative pb-3 last:pb-0">
              <span aria-hidden className={`absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-card ${DOT[e.tone]}`} />
              <span className="mr-2 font-mono text-xs tabular-nums text-dim">{e.at}</span>
              <span className="text-sm">{e.text}</span>
              {e.trace && (
                <span className="ml-2">
                  <TraceLink id={e.trace} />
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

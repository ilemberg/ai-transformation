import { LAST_NIGHT, NIGHTS, TASKS, type HarnessTask } from "../data";
import { formatDate, passRateTrend, taskTotals } from "../logic";
import { Result, Scroller, SubHeading, TD, TH, THEAD } from "./ui";

const FLOOR = 50;

function Note({ task }: { task: HarnessTask }) {
  if (!task.note) return null;
  return (
    <p className="text-xs text-fail-text">
      {task.note}{" "}
      <a href="#sweep-search-context" className="text-brand hover:underline">
        Cleanup log
      </a>
    </p>
  );
}

function Trend() {
  const rates = passRateTrend(NIGHTS);
  const avg = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  return (
    <figure>
      <SubHeading>Pass rate, last 14 nights</SubHeading>
      <div className="flex gap-2">
        <div className="flex h-24 flex-col justify-between text-right text-2xs text-faint tabular-nums" aria-hidden>
          <span>100%</span>
          <span>{FLOOR}%</span>
        </div>
        <ol className="flex h-24 min-w-0 flex-1 items-end gap-[3px] border-b border-l border-edge pl-[3px]" aria-label={`Nightly pass rate; average ${avg}%`}>
          {NIGHTS.map((n, i) => {
            const r = rates[i]!;
            return (
              <li
                key={n.date}
                title={`${formatDate(n.date)}: ${n.passed} of ${n.total} (${r}%)`}
                aria-label={`${formatDate(n.date)}: ${n.passed} of ${n.total}`}
                className={`min-w-0 flex-1 rounded-t-[2px] ${r === 100 ? "bg-pass" : "bg-warn"}`}
                style={{ height: `${Math.max(2, ((r - FLOOR) / (100 - FLOOR)) * 100)}%` }}
              />
            );
          })}
        </ol>
      </div>
      <figcaption className="mt-1 flex justify-between pl-10 text-2xs text-faint">
        <span>{formatDate(NIGHTS[0]!.date, true)}</span>
        <span>Average {avg}%</span>
        <span>{formatDate(NIGHTS.at(-1)!.date, true)}</span>
      </figcaption>
    </figure>
  );
}

export function HarnessTests() {
  const t = taskTotals(TASKS);
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <SubHeading>
          Night of {formatDate(LAST_NIGHT)}: {t.passed} of {t.total} passed · {t.ktokens.toLocaleString("en-US")}k tokens · ${t.costUsd.toFixed(2)}
        </SubHeading>

        <ul className="space-y-2 sm:hidden" aria-label="Last night's tasks">
          {TASKS.map((x) => (
            <li key={x.id} className={`min-w-0 rounded-md border bg-card p-2.5 text-sm ${x.pass ? "border-edge" : "border-fail"}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="mr-1.5 font-mono text-xs text-faint">{x.id}</span>
                  {x.task}
                </span>
                <Result pass={x.pass} />
              </div>
              <dl className="mt-1.5 space-y-1 text-xs">
                <div>
                  <dt className="inline text-faint">Expected: </dt>
                  <dd className="inline">{x.expected}</dd>
                </div>
                <div>
                  <dt className="inline text-faint">Actual: </dt>
                  <dd className="inline">{x.actual}</dd>
                </div>
                <div className="tabular-nums text-dim">
                  {x.ktokens}k tokens · ${x.costUsd.toFixed(2)}
                </div>
              </dl>
              {x.note && (
                <div className="mt-1.5">
                  <Note task={x} />
                </div>
              )}
            </li>
          ))}
        </ul>

        <Scroller label="Last night's tasks" className="hidden bg-card sm:block">
          <table className="w-full text-sm">
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Task</th>
                <th className={TH}>Expected</th>
                <th className={TH}>Actual</th>
                <th className={TH}>Result</th>
                <th className={`${TH} text-right`}>Tokens</th>
                <th className={`${TH} text-right`}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {TASKS.map((x) => (
                <tr key={x.id} className={`border-b border-edge align-top last:border-0 ${x.pass ? "" : "bg-fail-bg/40"}`}>
                  <td className={`${TD} min-w-48`}>
                    <span className="mr-1.5 font-mono text-xs text-faint">{x.id}</span>
                    {x.task}
                    {x.note && (
                      <div className="mt-1">
                        <Note task={x} />
                      </div>
                    )}
                  </td>
                  <td className={`${TD} min-w-44 text-dim`}>{x.expected}</td>
                  <td className={`${TD} min-w-36`}>{x.actual}</td>
                  <td className={TD}>
                    <Result pass={x.pass} />
                  </td>
                  <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{x.ktokens}k</td>
                  <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>${x.costUsd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroller>
      </div>
      <Trend />
    </div>
  );
}

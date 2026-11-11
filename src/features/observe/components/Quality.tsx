import { Lozenge } from "@/features/line/components/jira";
import { DRIFT_WEEK, QUALITY_CATEGORIES, QUALITY_WEEKS, RELEASE_THRESHOLD, SAMPLE_SIZE } from "../data";
import { passPct } from "../logic";
import { Scroller, Stat, TD, TH } from "./ui";

const W = 400;
const H = 120;
const Y_MIN = 88;
const Y_MAX = 98;

const y = (pct: number) => H - ((pct - Y_MIN) / (Y_MAX - Y_MIN)) * H;

export function Quality() {
  const rates = QUALITY_WEEKS.map((w) => passPct(w.passed, w.sampled));
  const n = QUALITY_WEEKS.length;
  const colW = W / n;
  const driftIdx = QUALITY_WEEKS.findIndex((w) => w.week === DRIFT_WEEK);
  // Thursday of the drift week: three sevenths of the way into its column.
  const driftX = driftIdx * colW + (3 / 7) * colW;
  const last = rates[n - 1]!;
  const prev = rates[n - 2]!;
  const blockingFails = QUALITY_CATEGORIES.filter((c) => c.blocking).reduce((sum, c) => sum + (SAMPLE_SIZE - c.passed[n - 1]!), 0);

  return (
    <div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={`Pass rate, ${QUALITY_WEEKS[n - 1]!.week}`} value={`${last.toFixed(1)}%`} tone={last >= RELEASE_THRESHOLD ? "pass" : "fail"} />
        <Stat label="Release threshold" value={`${RELEASE_THRESHOLD}%`} />
        <Stat label="Conversations scored / week" value={SAMPLE_SIZE} />
        <Stat label="Blocking failures" value={blockingFails} tone={blockingFails === 0 ? "pass" : "fail"} />
      </dl>

      <div className="mt-4 rounded-md border border-edge bg-card p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Rebooking assistant: pass rate by week</h3>
          <span className="text-xs tabular-nums text-dim">
            {prev.toFixed(1)}% → {last.toFixed(1)}%
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dim" aria-hidden>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-pass" /> pass rate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed border-fail" /> release threshold {RELEASE_THRESHOLD}%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 bg-purple" /> BW-158 new model at 100% (Thu 5 Nov)
          </span>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-2 block h-auto w-full"
          role="img"
          aria-label={`Weekly pass rate from ${QUALITY_WEEKS[0]!.week} to ${QUALITY_WEEKS[n - 1]!.week}: ${rates.map((r) => `${r.toFixed(1)}%`).join(", ")}. Threshold ${RELEASE_THRESHOLD}%. Model upgrade landed in ${DRIFT_WEEK}.`}
        >
          {[90, 94, 96].map((g) => (
            <line key={g} x1="0" x2={W} y1={y(g)} y2={y(g)} className="stroke-edge" strokeWidth="1" />
          ))}
          <line x1="0" x2={W} y1={y(RELEASE_THRESHOLD)} y2={y(RELEASE_THRESHOLD)} className="stroke-fail" strokeWidth="1.5" strokeDasharray="5 4" />
          <line x1={driftX} x2={driftX} y1="0" y2={H} className="stroke-purple" strokeWidth="2" />
          <polyline
            points={rates.map((r, i) => `${i * colW + colW / 2},${y(r)}`).join(" ")}
            fill="none"
            className="stroke-pass"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {rates.map((r, i) => (
            <circle key={i} cx={i * colW + colW / 2} cy={y(r)} r="3.5" className="fill-pass stroke-card" strokeWidth="1.5" />
          ))}
        </svg>
        <ol className="mt-1 grid text-center text-[11px] tabular-nums" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-label="Weeks">
          {QUALITY_WEEKS.map((w, i) => (
            <li key={w.week} className={w.week === DRIFT_WEEK ? "font-semibold text-purple" : "text-dim"}>
              <span className="block">{w.week}</span>
              <span className="block text-ink">{rates[i]!.toFixed(1)}%</span>
              <span className="hidden text-faint sm:block">n={w.sampled}</span>
            </li>
          ))}
        </ol>
      </div>

      <Scroller label="Scores by category and week, scrolls sideways" className="mt-4">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <caption className="sr-only">
            Share of the {SAMPLE_SIZE} scored conversations passing each check, by week. Data leak and prompt injection block a release on any failure.
          </caption>
          <thead className="bg-panel-2 text-xs text-dim">
            <tr>
              <th scope="col" className={TH}>Check</th>
              {QUALITY_WEEKS.map((w) => (
                <th key={w.week} scope="col" className={`${TH} text-right ${w.week === DRIFT_WEEK ? "bg-purple-bg text-purple" : ""}`}>
                  {w.week}
                </th>
              ))}
              <th scope="col" className={`${TH} text-right`}>Change</th>
            </tr>
          </thead>
          <tbody>
            {QUALITY_CATEGORIES.map((c) => {
              const pcts = c.passed.map((p) => passPct(p, SAMPLE_SIZE));
              const delta = pcts[n - 1]! - pcts[n - 2]!;
              return (
                <tr key={c.id} className="border-t border-edge hover:bg-hover">
                  <th scope="row" className={`${TD} font-medium`}>
                    <span className="inline-flex items-center gap-2">
                      {c.name}
                      {c.blocking && <Lozenge tone="danger">Blocking</Lozenge>}
                    </span>
                  </th>
                  {pcts.map((p, i) => (
                    <td
                      key={QUALITY_WEEKS[i]!.week}
                      className={`${TD} text-right tabular-nums ${QUALITY_WEEKS[i]!.week === DRIFT_WEEK ? "bg-purple-bg" : ""} ${c.blocking && p < 100 ? "font-semibold text-fail-text" : ""}`}
                    >
                      {p.toFixed(1)}
                    </td>
                  ))}
                  <td className={`${TD} text-right tabular-nums ${delta < -1 ? "font-semibold text-fail-text" : delta > 0 ? "text-pass-text" : "text-dim"}`}>
                    {delta > 0 ? "+" : delta < 0 ? "−" : "±"}
                    {Math.abs(delta).toFixed(1)} pts
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Scroller>
      <p className="mt-2 text-xs text-dim">
        {SAMPLE_SIZE} real conversations a week, scored on each check. Drift after the upgrade: wording down 2.0 pts, currency up 1.5.
      </p>
    </div>
  );
}

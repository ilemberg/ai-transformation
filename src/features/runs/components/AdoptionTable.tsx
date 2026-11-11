import { TEAMS } from "../data";

function Capacity({ pct }: { pct: number }) {
  const hot = pct >= 80;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-bg" aria-hidden>
        <div className={`h-full rounded-full ${hot ? "bg-warn" : "bg-brand"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`tabular-nums ${hot ? "font-semibold text-warn" : ""}`}>{pct}%</span>
    </div>
  );
}

export function AdoptionTable() {
  return (
    <div>
      <ul className="space-y-2 sm:hidden" aria-label="Adoption by team">
        {TEAMS.map((t) => {
          const delta = t.cfr - t.cfrBaseline;
          return (
            <li key={t.team} className="min-w-0 rounded-md border border-edge bg-card p-2.5 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {t.team}
                  {t.joinedMonth === 2 && <span className="ml-1.5 rounded-[3px] bg-info-bg px-1 text-[11px] font-bold uppercase text-info-text">Pilot</span>}
                </span>
                <span className="truncate text-xs text-dim">{t.owner}</span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div className="min-w-0">
                  <dt className="text-xs text-faint">Joined · onboarding</dt>
                  <dd className="tabular-nums">
                    Month {t.joinedMonth} · {t.onboardingWeeks} wk
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-faint">Reviewer capacity</dt>
                  <dd>
                    <Capacity pct={t.reviewerCapacityPct} />
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-faint">Support / month</dt>
                  <dd className="tabular-nums">
                    {t.supportNow} <span className="text-faint">(peak {t.supportPeak})</span>
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-faint">Change failure vs baseline</dt>
                  <dd className="tabular-nums">
                    {t.cfr.toFixed(1)}% <span className="text-faint">vs {t.cfrBaseline.toFixed(1)}%</span>{" "}
                    <span className={delta <= 0 ? "text-pass-text" : "text-fail-text"}>
                      ({delta > 0 ? "+" : "−"}
                      {Math.abs(delta).toFixed(1)} pts)
                    </span>
                  </dd>
                </div>
              </dl>
              <p className="mt-1.5 text-xs">
                <span className="text-faint">Exceptions: </span>
                <span className="font-semibold tabular-nums">{t.exceptions.length}</span>
                {t.exceptions.length > 0 && <span className="text-dim"> · {t.exceptions.join("; ")}</span>}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-md border border-edge sm:block" tabIndex={0} role="region" aria-label="Adoption by team, scrolls sideways">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <caption className="sr-only">For each team: owner, month joined, onboarding time, exceptions granted, reviewer capacity, support requests and change failure rate against the team&apos;s own baseline.</caption>
          <thead className="bg-panel-2 text-xs font-semibold text-dim">
            <tr>
              <th scope="col" className="px-3 py-2">Team</th>
              <th scope="col" className="px-3 py-2">Owner</th>
              <th scope="col" className="px-3 py-2 text-right">Joined</th>
              <th scope="col" className="px-3 py-2 text-right">Onboarding</th>
              <th scope="col" className="px-3 py-2">Exceptions granted</th>
              <th scope="col" className="px-3 py-2">Reviewer capacity used</th>
              <th scope="col" className="px-3 py-2 text-right">Support requests / month</th>
              <th scope="col" className="px-3 py-2 text-right">Change failure rate vs baseline</th>
            </tr>
          </thead>
          <tbody>
            {TEAMS.map((t) => {
              const delta = t.cfr - t.cfrBaseline;
              return (
                <tr key={t.team} className="border-t border-edge align-top hover:bg-hover">
                  <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium">
                    {t.team}
                    {t.joinedMonth === 2 && <span className="ml-1.5 rounded-[3px] bg-info-bg px-1 text-[11px] font-bold uppercase text-info-text">Pilot</span>}
                  </th>
                  <td className="whitespace-nowrap px-3 py-2 text-dim">{t.owner}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">Month {t.joinedMonth}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{t.onboardingWeeks} weeks</td>
                  <td className="px-3 py-2">
                    <span className="font-semibold tabular-nums">{t.exceptions.length}</span>
                    {t.exceptions.length > 0 && <span className="text-dim"> · {t.exceptions.join("; ")}</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Capacity pct={t.reviewerCapacityPct} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {t.supportNow} <span className="text-faint">(peak {t.supportPeak})</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {t.cfr.toFixed(1)}% <span className="text-faint">vs {t.cfrBaseline.toFixed(1)}%</span>{" "}
                    <span className={delta <= 0 ? "text-pass-text" : "text-fail-text"}>
                      ({delta > 0 ? "+" : "−"}
                      {Math.abs(delta).toFixed(1)} pts)
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-dim">
        As of month 12. Search and Rebooking piloted from month 2; Booking and Mobile joined in month 4; Payments and Platform waited until month 6, after
        the change-failure rule paused expansion. Each team is compared with its own baseline, measured in months 0 and 1.
      </p>
    </div>
  );
}

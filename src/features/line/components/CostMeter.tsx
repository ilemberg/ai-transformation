import { formatMinutes, formatTokens, formatUsd, stationAt, tierShares, totalsAt, totalsFor, type Cursor } from "../logic";
import { TIERS } from "../stations";
import { ENVIRONMENTS, type Ticket } from "../types";
import { Panel, SectionLabel, TIER_BG, TIER_TEXT } from "./ui";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <SectionLabel>{label}</SectionLabel>
      <span className="font-mono text-2xl font-medium tabular-nums">{value}</span>
      {sub && <span className="text-xs text-faint">{sub}</span>}
    </div>
  );
}

/** Running cost and time for the ticket, which model sizes did the work, and where the change is running. */
export function CostMeter({ ticket, cursor }: { ticket: Ticket; cursor: Cursor }) {
  const now = totalsAt(ticket, cursor);
  const all = totalsFor(ticket);
  const shares = tierShares(now);
  const tokens = now.ktokens.small + now.ktokens.medium + now.ktokens.large;
  const env = ENVIRONMENTS.indexOf(stationAt(cursor.station).environment);

  return (
    <Panel className="flex flex-col gap-5 p-5">
      <div>
        <SectionLabel>Cost and time so far</SectionLabel>
        <h3 className="mt-1 text-lg font-semibold">Spend tokens where judgement matters</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Model spend" value={formatUsd(now.aiUsd)} sub={`of ${formatUsd(all.aiUsd)} for the ticket`} />
        <Stat label="Sandbox and CI" value={formatUsd(now.computeUsd)} sub={`of ${formatUsd(all.computeUsd)}`} />
        <Stat label="Elapsed" value={formatMinutes(now.wallMinutes)} sub="including soak and watch time" />
        <Stat label="People's time" value={formatMinutes(now.humanMinutes)} sub="signing, reviewing, deciding" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <SectionLabel>Tokens by model size</SectionLabel>
          <span className="font-mono text-xs text-dim">{formatTokens(tokens)} tokens</span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-edge">
          {TIERS.map((t) => (
            <div
              key={t.id}
              className={`${TIER_BG[t.id]} h-full transition-[width] duration-700`}
              style={{ width: `${shares[t.id] * 100}%` }}
            />
          ))}
        </div>
        <ul className="grid gap-1 text-xs sm:grid-cols-3">
          {TIERS.map((t) => (
            <li key={t.id} className="flex flex-col">
              <span className={`${TIER_TEXT[t.id]} font-semibold`}>
                {t.name} · {Math.round(shares[t.id] * 100)}%
              </span>
              <span className="text-faint">{t.usedFor}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Where the change is</SectionLabel>
        <ol className="flex flex-wrap items-center gap-1 text-[11px]">
          {ENVIRONMENTS.map((e, i) => (
            <li key={e} className="flex items-center gap-1">
              <span
                className={`rounded-md border px-2 py-1 transition-colors ${
                  i === env
                    ? "border-speed bg-speed/15 text-ink"
                    : i < env
                      ? "border-edge text-dim"
                      : "border-edge/60 text-faint"
                }`}
              >
                {e}
              </span>
              {i < ENVIRONMENTS.length - 1 && <span className="text-faint">→</span>}
            </li>
          ))}
        </ol>
      </div>
      <p className="text-xs text-faint">Sample prices: small $1, medium $6, large $30 per million tokens; $0.02 per sandbox minute.</p>
    </Panel>
  );
}

import { Lozenge, type LozengeTone } from "@/features/line/components/jira";
import { AREA_LABEL, CHANGE_SIZE_POLICY, EXAMPLE_CHANGES, POLICY_ROWS, TIERS, TIER_LABEL, type Tier } from "../data";
import { sizeCap, tierFor } from "../logic";
import { Scroller, SubHeading, TD, TH, THEAD } from "./ui";

const TIER_TONE: Record<Tier, LozengeTone> = { low: "neutral", standard: "info", high: "warning" };

function TierLozenge({ tier }: { tier: Tier }) {
  return <Lozenge tone={TIER_TONE[tier]}>{TIER_LABEL[tier]}</Lozenge>;
}

export function RiskTiers() {
  const p = CHANGE_SIZE_POLICY;
  return (
    <div>
      <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-mono text-[0.929rem] font-semibold">{p.version}</span>
        <Lozenge tone="success">In force</Lozenge>
        <span className="text-dim">
          since month {p.effectiveMonth}; replaced {p.previous.version}, a flat {p.previous.cap}-line cap
        </span>
      </p>

      <div className="grid gap-2 sm:hidden">
        {TIERS.map((t) => (
          <section key={t} aria-label={`${TIER_LABEL[t]} risk`} className="min-w-0 rounded-md border border-edge bg-card p-2.5 text-sm">
            <TierLozenge tier={t} />
            <dl className="mt-2 space-y-1.5">
              {POLICY_ROWS.map((r) => (
                <div key={r.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
                  <dt className="text-xs text-faint">{r.label}</dt>
                  <dd className="text-xs">{r.values[t]}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <Scroller label="Risk tiers" className="hidden bg-card sm:block">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-40" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>
                <span className="sr-only">Applies</span>
              </th>
              {TIERS.map((t) => (
                <th key={t} className={TH}>
                  <TierLozenge tier={t} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {POLICY_ROWS.map((r) => (
              <tr key={r.label} className="border-b border-edge align-top last:border-0">
                <th scope="row" className={`${TD} text-left text-xs font-semibold text-dim`}>
                  {r.label}
                </th>
                {TIERS.map((t) => (
                  <td key={t} className={`${TD} min-w-40 ${r.label === "Change-size cap" ? "font-semibold tabular-nums" : ""}`}>
                    {r.values[t]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Scroller>

      <div className="mt-5 max-w-2xl">
        <SubHeading>Tier lookup: highest area touched wins</SubHeading>
        <ul className="divide-y divide-edge rounded-md border border-edge bg-card text-sm">
          {EXAMPLE_CHANGES.map((c) => {
            const tier = tierFor(c.areas);
            return (
              <li key={c.title} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <div>{c.title}</div>
                  <div className="text-xs text-faint">Touches {c.areas.map((a) => AREA_LABEL[a]).join(", ")}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <TierLozenge tier={tier} />
                  <span className="text-xs tabular-nums text-dim">≤ {sizeCap(tier)} lines</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

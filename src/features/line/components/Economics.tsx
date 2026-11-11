import { formatMinutes, formatUsd, totalsFor } from "../logic";
import { ACTORS, TIERS } from "../stations";
import { TICKETS } from "../tickets";
import { Panel, SectionLabel, TIER_TEXT } from "./ui";

const LEVERS = [
  {
    title: "Right size for the job",
    body: "Small models sort and summarise; medium models write tests and code; large models only plan, review and attack, where a miss costs the most.",
  },
  {
    title: "Cache the context",
    body: "The repo map, the spec and the style guide are the same on every call. Prompt caching makes repeat reads a fraction of the price.",
  },
  {
    title: "Batch what can wait",
    body: "Eval suites and nightly drift checks run as batch jobs, which are cheaper and do not compete with interactive work.",
  },
  {
    title: "Throwaway sandboxes",
    body: "Each agent run gets a fresh cloud container with a seeded database and no production secrets, and it is torn down when the run ends. Nothing idles.",
  },
  {
    title: "A budget per ticket",
    body: "An agent that loops eight times without progress, or passes its token budget, stops and asks a person. Runaway loops are the real cost risk.",
  },
  {
    title: "Measure cost per merged change",
    body: "Not cost per token. A cheap model that needs three review rounds is more expensive than a dear one that needs one.",
  },
];

/** The cost story across all three tickets, plus the levers that keep it down. */
export function Economics() {
  const agents = Object.values(ACTORS).filter((a) => a.kind === "agent");
  return (
    <section className="flex flex-col gap-6">
      <div className="flex max-w-3xl flex-col gap-2">
        <SectionLabel>Cost and models</SectionLabel>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">The right model at each station</h2>
        <p className="text-dim">
          The expensive part of this line is not the models. It is people&apos;s attention, and a bad change in
          production. Model spend is tuned so the large models sit where judgement matters and nowhere else.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <Panel key={tier.id} className="flex flex-col gap-3 p-5">
            <div className="flex items-baseline justify-between">
              <h3 className={`text-lg font-semibold ${TIER_TEXT[tier.id]}`}>{tier.name}</h3>
              <span className="font-mono text-xs text-faint">${tier.usdPerMillion} / M tokens (sample)</span>
            </div>
            <p className="text-sm text-dim">{tier.usedFor}</p>
            <ul className="flex flex-col gap-1 text-sm">
              {agents
                .filter((a) => a.tier === tier.id)
                .map((a) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.name}</span>
                    <span className="text-faint"> · {a.role}</span>
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-edge">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-panel-2 text-left font-mono text-[11px] uppercase tracking-wider text-faint">
            <tr>
              <th className="px-4 py-2.5 font-medium">Ticket</th>
              <th className="px-4 py-2.5 font-medium">Model spend</th>
              <th className="px-4 py-2.5 font-medium">Sandbox and CI</th>
              <th className="px-4 py-2.5 font-medium">People&apos;s time</th>
              <th className="px-4 py-2.5 font-medium">Start to 100% live</th>
            </tr>
          </thead>
          <tbody>
            {TICKETS.map((t) => {
              const all = totalsFor(t);
              // Elapsed to full release: everything before Observe.
              const toLive = t.steps.slice(0, 8).reduce((sum, s) => sum + s.usage.wallMinutes, 0);
              return (
                <tr key={t.id} className="border-t border-edge">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-dim">{t.key}</span>{" "}
                    <span className="capitalize">{t.kind}</span>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatUsd(all.aiUsd)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatUsd(all.computeUsd)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatMinutes(all.humanMinutes)}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{formatMinutes(toLive)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEVERS.map((l) => (
          <div key={l.title} className="flex flex-col gap-1.5 border-l-2 border-edge-2 pl-4">
            <h3 className="font-semibold">{l.title}</h3>
            <p className="text-sm text-dim">{l.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { AdoptionTable } from "@/features/runs/components/AdoptionTable";
import { FaultReplays } from "@/features/runs/components/FaultReplays";
import { QueueView } from "@/features/runs/components/QueueView";
import { RunRecord } from "@/features/runs/components/RunRecord";
import { Section } from "@/features/runs/components/ui";

export const metadata: Metadata = {
  title: "Runs · adevsworld",
  description:
    "How Bookwell's agent runs are orchestrated: a full run record with a refused test edit and an approved amendment, fault cases replayed, many runs at once, and adoption across six teams.",
};

const SECTIONS = [
  { id: "record", label: "Run record" },
  { id: "faults", label: "Fault cases" },
  { id: "concurrency", label: "Many runs at once" },
  { id: "adoption", label: "Adoption" },
];

export default function RunsPage() {
  return (
    <main className="bg-panel-2 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-dim">
        Projects <span className="text-faint">/</span> Bookwell <span className="text-faint">/</span> Runs
      </nav>
      <h1 className="mt-3 text-2xl font-medium">Runs</h1>
      <p className="mb-4 mt-1 text-sm text-dim">
        How the agent runs behind the board are orchestrated: every step recorded, failures recovered, many runs at once.
      </p>

      <nav aria-label="Sections" className="-mx-4 overflow-x-auto border-b border-edge px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-4 whitespace-nowrap text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-block border-b-2 border-transparent pb-2 font-medium text-dim hover:border-edge-2 hover:text-ink">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section
        id="record"
        title="Run record: BW-142, Build"
        lead="One run of the coding agent, step by step, as the orchestrator stored it. Every model call, tool result, rule decision and approval is a row with its cost and artifacts, so the run can be audited, billed and resumed."
      >
        <RunRecord />
      </Section>

      <Section
        id="faults"
        title="Fault cases"
        lead="What happens when something breaks partway through. A chain of prompts stops or starts again from scratch; the orchestrator holds the run's state outside the worker, so it can resume, dedupe, retry and cancel cleanly."
      >
        <FaultReplays />
      </Section>

      <Section
        id="concurrency"
        title="Many runs at once"
        lead="Runs across all six teams share workers, model providers and a codebase. The scheduler admits them under per-team and total limits and the provider's token limit, gives each its own workspace, and holds runs that would edit the same file."
      >
        <QueueView />
      </Section>

      <Section
        id="adoption"
        title="Adoption across teams"
        lead="Running it for six teams, not one: who owns it in each team, how long onboarding took, which exceptions were granted, and whether each team's change failure rate is better than its own baseline."
      >
        <AdoptionTable />
      </Section>
    </main>
  );
}

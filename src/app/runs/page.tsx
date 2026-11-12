import type { Metadata } from "next";
import { SectionTabs } from "@/components/SectionTabs";
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

export default function RunsPage() {
  return (
    <main className="bg-panel-2 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="hidden text-sm text-dim sm:block">
        Projects <span className="text-faint">/</span> Bookwell <span className="text-faint">/</span> Runs
      </nav>
      <h1 className="mb-3 text-2xl font-medium sm:mb-4 sm:mt-3">Runs</h1>

      <SectionTabs
        sections={[
          {
            id: "record",
            label: "Run record",
            short: "Record",
            content: (
              <Section
                id="record"
                title="Run record: BW-142, Build"
              >
                <RunRecord />
              </Section>
            ),
          },
          {
            id: "faults",
            label: "Fault cases",
            short: "Faults",
            content: (
              <Section
                id="faults"
                title="Fault cases"
                lead="What happens when something breaks partway through. A chain of prompts stops or starts again from scratch; the orchestrator holds the run's state outside the worker, so it can resume, dedupe, retry and cancel cleanly."
              >
                <FaultReplays />
              </Section>
            ),
          },
          {
            id: "concurrency",
            label: "Many runs at once",
            short: "Queue",
            content: (
              <Section
                id="concurrency"
                title="Many runs at once"
                lead="Runs across all six teams share workers, model providers and a codebase. The scheduler admits them under per-team and total limits and the provider's token limit, gives each its own workspace, and holds runs that would edit the same file."
              >
                <QueueView />
              </Section>
            ),
          },
          {
            id: "adoption",
            label: "Adoption",
            short: "Adoption",
            content: (
              <Section
                id="adoption"
                title="Adoption across teams"
                lead="Running it for six teams, not one: who owns it in each team, how long onboarding took, which exceptions were granted, and whether each team's change failure rate is better than its own baseline."
              >
                <AdoptionTable />
              </Section>
            ),
          },
        ]}
      />
    </main>
  );
}

import type { Metadata } from "next";
import { SectionTabs } from "@/components/SectionTabs";
import { ArchitectureRules } from "@/features/harness/components/ArchitectureRules";
import { Cleanup } from "@/features/harness/components/Cleanup";
import { HarnessTests } from "@/features/harness/components/HarnessTests";
import { Inventory } from "@/features/harness/components/Inventory";
import { RiskTiers } from "@/features/harness/components/RiskTiers";
import { Section } from "@/features/harness/components/ui";

export const metadata: Metadata = {
  title: "Harness · adevsworld",
  description:
    "Bookwell's engineering harness: instructions, prompts, skills, tools, policies, evals and guardrails with owners and change histories, tested nightly against representative tasks, with executable architecture rules, risk-tier approvals and scheduled cleanup.",
};

export default function HarnessPage() {
  return (
    <main className="bg-panel-2 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="hidden text-sm text-dim sm:block">
        Projects <span className="text-faint">/</span> Bookwell <span className="text-faint">/</span> Harness
      </nav>
      <h1 className="mb-3 text-2xl font-medium sm:mb-4 sm:mt-3">Harness</h1>

      <SectionTabs
        sections={[
          {
            id: "inventory",
            label: "Inventory",
            short: "Inventory",
            content: (
              <Section id="inventory" title="Inventory">
                <Inventory />
              </Section>
            ),
          },
          {
            id: "tests",
            label: "Harness tests",
            short: "Tests",
            content: (
              <Section id="tests" title="Harness tests">
                <HarnessTests />
              </Section>
            ),
          },
          {
            id: "architecture",
            label: "Architecture rules",
            short: "Rules",
            content: (
              <Section id="architecture" title="Architecture rules">
                <ArchitectureRules />
              </Section>
            ),
          },
          {
            id: "policies",
            label: "Risk tiers and approvals",
            short: "Tiers",
            content: (
              <Section id="policies" title="Risk tiers and approvals">
                <RiskTiers />
              </Section>
            ),
          },
          {
            id: "cleanup",
            label: "Cleanup",
            short: "Cleanup",
            content: (
              <Section id="cleanup" title="Cleanup">
                <Cleanup />
              </Section>
            ),
          },
        ]}
      />
    </main>
  );
}

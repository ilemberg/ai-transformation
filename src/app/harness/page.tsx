import type { Metadata } from "next";
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

const SECTIONS = [
  { id: "inventory", label: "Inventory" },
  { id: "tests", label: "Harness tests" },
  { id: "architecture", label: "Architecture rules" },
  { id: "policies", label: "Risk tiers and approvals" },
  { id: "cleanup", label: "Cleanup" },
];

export default function HarnessPage() {
  return (
    <main className="bg-panel-2 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-dim">
        Projects <span className="text-faint">/</span> Bookwell <span className="text-faint">/</span> Harness
      </nav>
      <h1 className="mb-4 mt-3 text-2xl font-medium">Harness</h1>

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

      <Section id="inventory" title="Inventory">
        <Inventory />
      </Section>

      <Section id="tests" title="Harness tests">
        <HarnessTests />
      </Section>

      <Section id="architecture" title="Architecture rules">
        <ArchitectureRules />
      </Section>

      <Section id="policies" title="Risk tiers and approvals">
        <RiskTiers />
      </Section>

      <Section id="cleanup" title="Cleanup">
        <Cleanup />
      </Section>
    </main>
  );
}

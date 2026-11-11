import type { Metadata } from "next";
import { Suspense } from "react";
import { Alerts } from "@/features/observe/components/Alerts";
import { ModelCalls } from "@/features/observe/components/ModelCalls";
import { Quality } from "@/features/observe/components/Quality";
import { ServiceHealth } from "@/features/observe/components/ServiceHealth";
import { TraceExplorer, TraceView } from "@/features/observe/components/TraceExplorer";
import { Section } from "@/features/observe/components/ui";
import { DEFAULT_TRACE_ID } from "@/features/observe/data";

export const metadata: Metadata = {
  title: "Observe · adevsworld",
  description:
    "Bookwell in production: a traveller's rebooking traced span by span, every model call with cost and fallback, journey health against a 99.9% target, alerts and on-call, and weekly scoring of real AI answers.",
};

const SECTIONS = [
  { id: "trace", label: "Trace explorer" },
  { id: "models", label: "Model calls" },
  { id: "health", label: "Service health" },
  { id: "alerts", label: "Alerts and on-call" },
  { id: "quality", label: "Quality in production" },
];

export default function ObservePage() {
  return (
    <main className="bg-panel-2 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-dim">
        Projects <span className="text-faint">/</span> Bookwell <span className="text-faint">/</span> Observe
      </nav>
      <h1 className="mb-4 mt-3 text-2xl font-medium">Observe</h1>

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

      <Section id="trace" title="Trace explorer">
        <Suspense fallback={<TraceView traceId={DEFAULT_TRACE_ID} />}>
          <TraceExplorer />
        </Suspense>
      </Section>

      <Section id="models" title="Model calls">
        <ModelCalls />
      </Section>

      <Section id="health" title="Service health">
        <ServiceHealth />
      </Section>

      <Section id="alerts" title="Alerts and on-call">
        <Alerts />
      </Section>

      <Section id="quality" title="Quality in production">
        <Quality />
      </Section>
    </main>
  );
}

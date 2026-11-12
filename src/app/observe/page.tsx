import type { Metadata } from "next";
import { SectionTabs } from "@/components/SectionTabs";
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

export default function ObservePage() {
  return (
    <main className="bg-panel-2 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="hidden text-sm text-dim sm:block">
        Projects <span className="text-faint">/</span> Bookwell <span className="text-faint">/</span> Observe
      </nav>
      <h1 className="mb-3 text-2xl font-medium sm:mb-4 sm:mt-3">Observe</h1>

      <SectionTabs
        sections={[
          {
            id: "trace",
            label: "Trace explorer",
            short: "Trace",
            content: (
              <Section id="trace" title="Trace explorer">
                <Suspense fallback={<TraceView traceId={DEFAULT_TRACE_ID} />}>
                  <TraceExplorer />
                </Suspense>
              </Section>
            ),
          },
          {
            id: "models",
            label: "Model calls",
            short: "Models",
            content: (
              <Section id="models" title="Model calls">
                <ModelCalls />
              </Section>
            ),
          },
          {
            id: "health",
            label: "Service health",
            short: "Health",
            content: (
              <Section id="health" title="Service health">
                <ServiceHealth />
              </Section>
            ),
          },
          {
            id: "alerts",
            label: "Alerts and on-call",
            short: "Alerts",
            content: (
              <Section id="alerts" title="Alerts and on-call">
                <Alerts />
              </Section>
            ),
          },
          {
            id: "quality",
            label: "Quality in production",
            short: "Quality",
            content: (
              <Section id="quality" title="Quality in production">
                <Quality />
              </Section>
            ),
          },
        ]}
      />
    </main>
  );
}

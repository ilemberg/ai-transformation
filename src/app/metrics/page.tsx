import type { Metadata } from "next";
import { Suspense } from "react";
import { DEFAULT_MONTH, MetricsDashboard, MetricsView } from "@/features/metrics/components/MetricsDashboard";

export const metadata: Metadata = {
  title: "The numbers · Ticket to Production",
  description:
    "How an engineering org measures an AI transformation of its software lifecycle: paired speed and quality metrics, decision rules agreed in advance, cost by model tier, and a full scorecard over a twelve-month rollout.",
};

export default function MetricsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <header className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-widest text-faint">Measuring the transformation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Faster only counts if nothing else got worse
        </h1>
        <p className="mt-4 text-base leading-relaxed text-dim sm:text-lg">
          A year of Bookwell bringing AI agents into how it builds and ships software, measured month by month. Drag
          the slider or press Play to watch the numbers move, the decision rules fire, and the fixes land.
        </p>
      </header>

      <aside
        aria-label="About this data"
        className="mt-6 flex max-w-3xl gap-3 rounded-xl border border-warn/40 bg-warn/[0.07] p-4 text-sm leading-relaxed"
      >
        <span aria-hidden className="mt-0.5 font-mono text-warn">
          !
        </span>
        <p>
          <strong className="text-warn">Sample data.</strong>{" "}
          <span className="text-dim">
            Bookwell is a made-up business-travel booking company. Every number on this page was written to illustrate
            the method; none of it was measured.
          </span>
        </p>
      </aside>

      <div className="mt-10">
        <Suspense fallback={<MetricsView month={DEFAULT_MONTH} />}>
          <MetricsDashboard />
        </Suspense>
      </div>
    </main>
  );
}

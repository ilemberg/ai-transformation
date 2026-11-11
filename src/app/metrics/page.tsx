import type { Metadata } from "next";
import { Suspense } from "react";
import { DEFAULT_MONTH, MetricsDashboard, MetricsView } from "@/features/metrics/components/MetricsDashboard";

export const metadata: Metadata = {
  title: "Metrics · Ticket to Production",
  description:
    "A year of an AI rollout in numbers: paired speed and quality metrics, decision rules, and cost by model size. Sample data.",
};

export default function MetricsPage() {
  return (
    <main className="bg-panel-2 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-dim">
        Projects <span className="text-faint">/</span> Bookwell <span className="text-faint">/</span> Reports
      </nav>
      <h1 className="mb-4 mt-3 text-2xl font-medium">AI rollout dashboard</h1>
      <Suspense fallback={<MetricsView month={DEFAULT_MONTH} />}>
        <MetricsDashboard />
      </Suspense>
    </main>
  );
}

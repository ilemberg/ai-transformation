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
    <main className="mx-auto max-w-[1280px] px-4 pt-5 sm:px-6">
      <h1 className="mb-4 text-xl font-normal sm:text-2xl">
        A year of the rollout <span className="text-faint">· speed never reported without quality</span>
      </h1>
      <Suspense fallback={<MetricsView month={DEFAULT_MONTH} />}>
        <MetricsDashboard />
      </Suspense>
    </main>
  );
}

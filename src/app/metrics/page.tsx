import type { Metadata } from "next";
import { Suspense } from "react";
import { DEFAULT_MONTH, MetricsDashboard, MetricsView } from "@/features/metrics/components/MetricsDashboard";

export const metadata: Metadata = {
  title: "Engineering reports · adevsworld",
  description:
    "Bookwell's AI rollout month by month: every speed metric paired with the quality metric it could hurt, the decision rules that act on them, and cost by model size.",
};

export default function MetricsPage() {
  return (
    <main className="bg-panel-2 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-dim">
        Projects <span className="text-faint">/</span> Bookwell <span className="text-faint">/</span> Reports
      </nav>
      <h1 className="mt-3 text-2xl font-medium">Engineering reports</h1>
      <p className="mb-4 mt-1 text-sm text-dim">
        For engineering leads: velocity, quality, and whether the rollout is what is improving them.
      </p>
      <Suspense fallback={<MetricsView month={DEFAULT_MONTH} />}>
        <MetricsDashboard />
      </Suspense>
    </main>
  );
}

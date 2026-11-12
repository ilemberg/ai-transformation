import type { Metadata } from "next";
import { Suspense } from "react";
import { DEFAULT_MONTH, Dashboard, DashboardView } from "@/features/dashboard/components/Dashboard";

export const metadata: Metadata = {
  title: "Executive dashboard · adevsworld",
  description:
    "Bookwell's AI rollout for executives and finance: what shipped, what it cost against budget, and the risk, for any month of the year, as gadgets you can add, remove and rearrange.",
};

export default function DashboardPage() {
  return (
    <main className="bg-panel-2 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="hidden text-sm text-dim sm:block">
        Projects <span className="text-faint">/</span> Bookwell <span className="text-faint">/</span> Dashboard
      </nav>
      <Suspense fallback={<DashboardView month={DEFAULT_MONTH} />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

import type { Metadata } from "next";
import { Dashboard } from "@/features/dashboard/components/Dashboard";

export const metadata: Metadata = {
  title: "Dashboard · Ticket to Production",
  description:
    "A stakeholder dashboard for the AI rollout: token spend, velocity and delivery metrics as gadgets you can add, remove and rearrange. Sample data.",
};

export default function DashboardPage() {
  return (
    <main className="bg-panel-2 px-4 pb-10 pt-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-dim">
        Projects <span className="text-faint">/</span> Bookwell <span className="text-faint">/</span> Dashboard
      </nav>
      <Dashboard />
    </main>
  );
}

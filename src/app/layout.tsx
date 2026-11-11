import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticket to Production · an AI-native delivery workflow",
  description:
    "An animated AI-native software workflow: tests and evals first, agents building, other models reviewing, gates, load and break-it testing, release, monitoring and the bug loop. With the metrics that show whether it works. Sample data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="font-sans">
        <SiteNav />
        {children}
        <footer className="mx-auto max-w-[1280px] px-4 pb-8 pt-10 text-xs text-faint sm:px-6">
          Sample data. Bookwell is a made-up travel booking app; nothing here was measured.
        </footer>
      </body>
    </html>
  );
}

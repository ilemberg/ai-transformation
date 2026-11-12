import type { Metadata, Viewport } from "next";
import { Sidebar, TabBar, TopBar } from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "adevsworld · an AI-native delivery board",
  description:
    "An animated AI-native software workflow: tests and evals first, agents building, other models reviewing, gates, load and break-it testing, release, monitoring and the bug loop. With the metrics that show whether it works.",
};

/** Lets the tab bar sit above the home indicator on phones with one. */
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="font-sans">
        <TopBar />
        <div className="flex pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Sidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
        <TabBar />
      </body>
    </html>
  );
}

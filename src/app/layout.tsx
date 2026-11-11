import type { Metadata } from "next";
import { Sidebar, TopBar } from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "adevsworld · an AI-native delivery board",
  description:
    "An animated AI-native software workflow: tests and evals first, agents building, other models reviewing, gates, load and break-it testing, release, monitoring and the bug loop. With the metrics that show whether it works.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <body className="font-sans">
        <TopBar />
        <div className="flex">
          <Sidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}

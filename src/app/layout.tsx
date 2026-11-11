import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ticket to Production · an AI-native delivery line",
  description:
    "An animated walk through an AI-native software lifecycle: tests and evals written first, agents building, other models reviewing, gates, load and break-it testing, release, monitoring, and the bug loop. With the metrics that show whether it is working.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="font-sans">
        <SiteNav />
        {children}
        <footer className="mx-auto max-w-7xl px-4 pb-10 pt-16 text-sm text-faint sm:px-6">
          Bookwell is a made-up business-travel booking app used as the example. Every ticket, log line, cost and
          metric here is sample data written to show the process; none of it was measured.
        </footer>
      </body>
    </html>
  );
}

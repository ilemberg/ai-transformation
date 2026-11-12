import Link from "next/link";
import { Lozenge } from "@/features/line/components/jira";
import { ticketHref, type TicketKey } from "../data";

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-6 scroll-mt-20 rounded-md border border-edge bg-panel p-4 shadow-card sm:p-5">
      <h2 id={`${id}-h`} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold">{children}</h3>;
}

/** Wraps something wide so that only it scrolls sideways, never the page. */
export function Scroller({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-md border border-edge ${className}`} tabIndex={0} role="region" aria-label={label}>
      {children}
    </div>
  );
}

export const TH = "px-3 py-2 font-semibold";
export const TD = "px-3 py-2";
export const THEAD = "border-b border-edge bg-panel-2 text-left text-xs text-dim";

export function TicketLink({ ticket }: { ticket?: TicketKey }) {
  if (!ticket) return <span className="text-faint">—</span>;
  return (
    <Link href={ticketHref(ticket)} className="whitespace-nowrap font-mono text-xs text-brand hover:underline">
      {ticket}
    </Link>
  );
}

export function Result({ pass }: { pass: boolean }) {
  return <Lozenge tone={pass ? "success" : "danger"}>{pass ? "Pass" : "Fail"}</Lozenge>;
}

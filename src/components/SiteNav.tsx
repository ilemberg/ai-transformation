"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Board", long: "Delivery board", icon: BoardIcon },
  { href: "/metrics", label: "Reports", long: "Engineering reports", icon: ReportsIcon },
  { href: "/dashboard", label: "Dashboard", long: "Executive dashboard", icon: DashboardIcon },
  { href: "/runs", label: "Runs", long: "Agent runs", icon: RunsIcon },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** The top bar of a project-tracker app. On a phone it also carries the page links. */
export function TopBar() {
  const isActive = useActive();
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-edge bg-panel px-3">
      <span aria-hidden className="hidden h-8 w-8 grid-cols-3 place-content-center sm:grid gap-[3px] rounded p-2 text-faint">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="h-[3px] w-[3px] rounded-full bg-current" />
        ))}
      </span>
      <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
        <Logo />
        <span className="hidden text-base tracking-tight sm:inline">
          adevs<span className="text-brand">world</span>
        </span>
      </Link>
      <nav className="ml-1 flex min-w-0 gap-0.5 overflow-x-auto lg:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap rounded px-1.5 py-1 text-sm font-medium ${isActive(l.href) ? "bg-selected text-brand" : "text-dim hover:bg-hover"}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/**
 * The project sidebar. Desktop only: an icon rail on laptops, so the board's
 * ten columns fit, and the full sidebar on wide screens.
 */
export function Sidebar() {
  const isActive = useActive();
  return (
    <aside className="sticky top-12 hidden h-[calc(100dvh-3rem)] w-14 shrink-0 flex-col border-r border-edge bg-panel-2 px-2 py-4 lg:flex 2xl:w-60">
      <div className="mb-4 flex items-center gap-2 px-1 2xl:px-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-purple text-sm font-bold text-white">BW</span>
        <div className="hidden min-w-0 2xl:block">
          <div className="truncate font-semibold">Bookwell</div>
          <div className="text-xs text-faint">Travel booking · 6 teams</div>
        </div>
      </div>
      <div className="hidden px-2 pb-1 text-[11px] font-bold uppercase text-faint 2xl:block">Planning</div>
      {LINKS.map((l) => {
        const active = isActive(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            title={l.long}
            className={`relative flex h-9 items-center gap-3 rounded px-2.5 text-sm 2xl:px-2 ${
              active ? "bg-selected font-medium text-brand" : "text-dim hover:bg-hover"
            }`}
          >
            {active && <span aria-hidden className="absolute left-0 top-2 h-5 w-[3px] rounded-r bg-brand" />}
            <Icon />
            <span className="sr-only 2xl:not-sr-only">{l.long}</span>
          </Link>
        );
      })}
    </aside>
  );
}

/** The mark: a stick figure coding at a laptop. */
export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="adevsworld">
      <rect width="24" height="24" rx="5" className="fill-brand" />
      <g fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="6" r="2.2" />
        <path d="M8 8.4v6.1h4.2V19" />
        <path d="M8 10.6l5 1.6" />
        <path d="M13.2 13.6h6.3l1.4-5.4" />
      </g>
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <rect x="1.5" y="2" width="3.5" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="6.25" y="2" width="3.5" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="2" width="3.5" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function RunsIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <path d="M2 4h8M2 8h12M2 12h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="13" cy="4" r="1.6" fill="currentColor" />
      <circle cx="11" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <rect x="1.5" y="1.5" width="5.5" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="1.5" width="5.5" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1.5" y="10.5" width="5.5" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="7.5" width="5.5" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <path d="M2 14h12M4 11V7m4 4V3m4 8V6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

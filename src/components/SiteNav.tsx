"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Board", long: "Delivery board", icon: BoardIcon },
  { href: "/metrics", label: "Reports", long: "Engineering reports", icon: ReportsIcon },
  { href: "/dashboard", label: "Dashboard", long: "Executive dashboard", icon: DashboardIcon },
  { href: "/runs", label: "Runs", long: "Agent runs", icon: RunsIcon },
  { href: "/observe", label: "Observe", long: "Observe", icon: ObserveIcon },
  { href: "/harness", label: "Harness", long: "Harness", icon: HarnessIcon },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/**
 * The top bar of a project-tracker app. On phones and tablets it only says
 * the product and the project; the page links are in the tab bar at the bottom.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-edge bg-panel px-4 sm:px-3">
      <span aria-hidden className="hidden h-8 w-8 grid-cols-3 place-content-center gap-[3px] rounded p-2 text-faint lg:grid">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="h-[3px] w-[3px] rounded-full bg-current" />
        ))}
      </span>
      <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
        <Logo />
        <span className="text-base tracking-tight">
          adevs<span className="text-brand">world</span>
        </span>
      </Link>
      <span className="ml-auto flex items-center gap-2 text-sm text-dim lg:hidden">
        <span aria-hidden className="grid h-6 w-6 place-items-center rounded bg-purple text-[10px] font-bold text-white">BW</span>
        Bookwell
      </span>
    </header>
  );
}

/**
 * The page links on phones and tablets: a tab bar within reach of a thumb,
 * every destination visible at once with an icon and a label.
 */
export function TabBar() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Pages"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-edge bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {LINKS.map((l) => {
        const active = isActive(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-14 min-w-0 flex-col items-center justify-center gap-1 ${active ? "font-semibold text-brand" : "text-dim"}`}
          >
            {active && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b bg-brand" />}
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate px-0.5 text-[11px] leading-none">{l.label}</span>
          </Link>
        );
      })}
    </nav>
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
      <div className="hidden px-2 pb-1 text-2xs font-bold uppercase text-faint 2xl:block">Planning</div>
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

function BoardIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <rect x="1.5" y="2" width="3.5" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="6.25" y="2" width="3.5" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="2" width="3.5" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function HarnessIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M8 1.5 13.5 4v4c0 3.2-2.3 5.6-5.5 6.5C4.8 13.6 2.5 11.2 2.5 8V4Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m5.5 8 1.8 1.8 3.2-3.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ObserveIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M1 9h3l2-5 3 9 2-6 1 2h3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RunsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M2 4h8M2 8h12M2 12h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="13" cy="4" r="1.6" fill="currentColor" />
      <circle cx="11" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

function DashboardIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <rect x="1.5" y="1.5" width="5.5" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="1.5" width="5.5" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1.5" y="10.5" width="5.5" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="7.5" width="5.5" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ReportsIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <path d="M2 14h12M4 11V7m4 4V3m4 8V6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

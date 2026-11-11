"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Board", icon: BoardIcon },
  { href: "/metrics", label: "Reports", icon: ReportsIcon },
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
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
      <span aria-hidden className="grid h-8 w-8 grid-cols-3 place-content-center gap-[3px] rounded p-2 text-faint">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="h-[3px] w-[3px] rounded-full bg-current" />
        ))}
      </span>
      <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
        <span className="grid h-6 w-6 place-items-center rounded bg-brand text-[11px] font-bold text-white">T</span>
        <span className="hidden sm:inline">Ticket to Production</span>
      </Link>
      <nav className="ml-2 flex gap-1 lg:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            className={`rounded px-2 py-1 text-sm font-medium ${isActive(l.href) ? "bg-selected text-brand" : "text-dim hover:bg-hover"}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <span className="ml-auto hidden rounded-[3px] bg-warn-bg sm:inline px-1.5 text-[11px] font-bold uppercase text-warn">Sample data</span>
    </header>
  );
}

/** The project sidebar: project name and its two views. Desktop only. */
export function Sidebar() {
  const isActive = useActive();
  return (
    <aside className="sticky top-12 hidden h-[calc(100dvh-3rem)] w-60 shrink-0 flex-col border-r border-edge bg-panel-2 px-2 py-4 lg:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <span className="grid h-8 w-8 place-items-center rounded bg-purple text-sm font-bold text-white">BW</span>
        <div className="min-w-0">
          <div className="truncate font-semibold">Bookwell</div>
          <div className="text-xs text-faint">Software project · sample</div>
        </div>
      </div>
      <div className="px-2 pb-1 text-[11px] font-bold uppercase text-faint">Planning</div>
      {LINKS.map((l) => {
        const active = isActive(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex h-9 items-center gap-3 rounded px-2 text-sm ${
              active ? "bg-selected font-medium text-brand" : "text-dim hover:bg-hover"
            }`}
          >
            {active && <span aria-hidden className="absolute left-0 top-2 h-5 w-[3px] rounded-r bg-brand" />}
            <Icon />
            {l.label}
          </Link>
        );
      })}
      <p className="mt-auto px-2 text-xs text-faint">Bookwell is a made-up travel booking app. Nothing here was measured.</p>
    </aside>
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

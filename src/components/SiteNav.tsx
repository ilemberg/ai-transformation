"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Workflow" },
  { href: "/metrics", label: "Metrics" },
];

/** A repository-style header: name on top, underline tabs below. */
export function SiteNav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-edge bg-panel-2">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="flex items-center gap-2 pt-4 text-base">
          <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 fill-dim">
            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
          </svg>
          <span className="text-accent">bookwell</span>
          <span className="text-faint">/</span>
          <Link href="/" className="font-semibold text-accent hover:underline">
            ticket-to-production
          </Link>
          <span className="ml-1 rounded-full border border-edge px-2 text-xs font-medium text-dim">Sample</span>
        </div>
        <nav className="mt-3 flex gap-2">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px border-b-2 px-2 pb-2 pt-1 text-sm ${
                  active ? "border-[#fd8c73] font-semibold text-ink" : "border-transparent text-ink hover:border-edge-2"
                }`}
              >
                <span className="rounded-md px-2 py-1 hover:bg-edge/40">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

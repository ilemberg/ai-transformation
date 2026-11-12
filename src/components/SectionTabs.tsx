"use client";

import { useRef, useSyncExternalStore } from "react";

export type SectionDef = {
  id: string;
  /** The full name, used on wide screens and for screen readers. */
  label: string;
  /** One word for the phone's tab strip, so every section fits without scrolling. */
  short: string;
  content: React.ReactNode;
};

/** Below this width a page shows one section at a time. Matches Tailwind's `md`. */
const WIDE = "(min-width: 768px)";

function subscribe(notify: () => void) {
  // Links inside the page (a trace id, a cleanup entry) change the hash through
  // the router, which fires no hashchange, so re-read shortly after any click.
  const later = () => window.setTimeout(notify, 60);
  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);
  document.addEventListener("click", later);
  return () => {
    window.removeEventListener("hashchange", notify);
    window.removeEventListener("popstate", notify);
    document.removeEventListener("click", later);
  };
}

/**
 * A page made of several sections. On wide screens they are stacked, with
 * links that jump to each. On a phone that would be one very long scroll, so
 * only the chosen section is shown, picked from a tab strip that stays under
 * the top bar. The address hash is the single record of which one is open.
 */
export function SectionTabs({ sections }: { sections: SectionDef[] }) {
  const top = useRef<HTMLDivElement>(null);
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1),
    () => "",
  );
  const found = sections.findIndex((s) => s.id === hash);
  const index = found === -1 ? 0 : found;

  const open = (id: string, e?: React.MouseEvent) => {
    if (window.matchMedia(WIDE).matches) return; // let the link jump to the section
    e?.preventDefault();
    window.history.replaceState(window.history.state, "", `#${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    // Start the new section from its top, without moving if the strip is already in view.
    const el = top.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView();
  };

  const previous = sections[index - 1];
  const next = sections[index + 1];

  return (
    <>
      <div ref={top} className="scroll-mt-12" />
      <nav aria-label="Sections" className="hidden border-b border-edge md:block">
        <ul className="flex gap-4 whitespace-nowrap text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-block border-b-2 border-transparent pb-2 font-medium text-dim hover:border-edge-2 hover:text-ink">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Sections" className="sticky top-12 z-20 -mx-4 border-b border-edge bg-panel-2 px-4 py-2 md:hidden">
        <ul className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg bg-neutral-bg p-0.5">
          {sections.map((s, i) => (
            <li key={s.id} className="min-w-0">
              <a
                href={`#${s.id}`}
                onClick={(e) => open(s.id, e)}
                aria-current={i === index ? "true" : undefined}
                aria-label={s.label}
                className={`flex h-9 items-center justify-center rounded-md px-1 text-[13px] font-medium ${
                  i === index ? "bg-card text-brand shadow-card" : "text-dim"
                }`}
              >
                <span className="truncate">{s.short}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {sections.map((s, i) => (
        <div key={s.id} className={i === index ? "" : "max-md:hidden"}>
          {s.content}
        </div>
      ))}

      <nav aria-label="Previous and next section" className="mt-6 flex gap-2 md:hidden">
        {previous && (
          <a
            href={`#${previous.id}`}
            onClick={(e) => open(previous.id, e)}
            aria-label={`Previous: ${previous.label}`}
            className={`flex h-12 min-w-0 items-center gap-2 rounded-lg border border-edge bg-card px-4 text-sm text-dim ${next ? "flex-none" : "flex-1"}`}
          >
            <span aria-hidden>‹</span>
            <span className="truncate">{next ? previous.short : previous.label}</span>
          </a>
        )}
        {next && (
          <a
            href={`#${next.id}`}
            onClick={(e) => open(next.id, e)}
            className="flex h-12 min-w-0 flex-1 items-center justify-end gap-2 rounded-lg bg-brand px-3 text-sm font-medium text-white"
          >
            <span className="truncate">Next: {next.label}</span>
            <span aria-hidden>›</span>
          </a>
        )}
      </nav>
    </>
  );
}

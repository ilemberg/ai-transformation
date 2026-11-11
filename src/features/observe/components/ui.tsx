import type { ModelTier } from "../data";

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

/** A compact figure: label above, value below. */
export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "pass" | "fail" | "warn" }) {
  const colour = tone === "pass" ? "text-pass-text" : tone === "fail" ? "text-fail-text" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="min-w-0 rounded-[3px] border border-edge bg-card px-3 py-2">
      <dt className="truncate text-xs text-dim">{label}</dt>
      <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${colour}`}>{value}</dd>
    </div>
  );
}

const TIER_BG: Record<ModelTier, string> = { small: "bg-small", medium: "bg-medium", large: "bg-large" };

export function TierDot({ tier }: { tier: ModelTier }) {
  return <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${TIER_BG[tier]}`} />;
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
export const TD = "whitespace-nowrap px-3 py-2";

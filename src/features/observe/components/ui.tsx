import type { ModelTier } from "../data";

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-4 scroll-mt-28 md:mt-6 md:scroll-mt-20 md:rounded-md md:border md:border-edge md:bg-panel md:p-5 md:shadow-card">
      <h2 id={`${id}-h`} className="text-lg font-semibold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * A compact figure: label above, value below. `wrap` is for narrow grids on phones:
 * below `sm` the label may wrap and the box is tighter; from `sm` up it is unchanged.
 */
export function Stat({ label, value, tone, wrap = false }: { label: string; value: React.ReactNode; tone?: "pass" | "fail" | "warn"; wrap?: boolean }) {
  const colour = tone === "pass" ? "text-pass-text" : tone === "fail" ? "text-fail-text" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className={`flex min-w-0 flex-col rounded-[3px] border border-edge bg-card py-2 ${wrap ? "px-2 sm:px-3" : "px-3"}`}>
      <dt className={`text-xs text-dim ${wrap ? "leading-tight sm:truncate sm:leading-normal" : "truncate"}`}>{label}</dt>
      <dd className={`mt-auto pt-0.5 font-semibold tabular-nums ${wrap ? "text-base sm:text-lg" : "text-lg"} ${colour}`}>{value}</dd>
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

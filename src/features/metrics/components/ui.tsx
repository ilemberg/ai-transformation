import type { MetricKind } from "../data";
import type { Delta, Verdict } from "../logic";

export const KIND_TEXT: Record<MetricKind, string> = {
  speed: "text-speed",
  quality: "text-quality",
  other: "text-system",
};

export const KIND_LABEL: Record<MetricKind, string> = {
  speed: "Speed",
  quality: "Quality",
  other: "Health",
};

export function KindTag({ kind }: { kind: MetricKind }) {
  const styles: Record<MetricKind, string> = {
    speed: "bg-info-bg text-info-text",
    quality: "bg-pass-bg text-pass-text",
    other: "bg-neutral-bg text-dim",
  };
  return (
    <span className={`inline-flex h-4 items-center rounded-[3px] px-1 text-[11px] font-bold uppercase leading-none ${styles[kind]}`}>
      {KIND_LABEL[kind]}
    </span>
  );
}

const VERDICT_STYLE: Record<Verdict, { cls: string; icon: string }> = {
  Healthy: { cls: "bg-pass-bg text-pass-text", icon: "✓" },
  Watch: { cls: "bg-warn-bg text-warn", icon: "!" },
  Regression: { cls: "bg-fail-bg text-fail-text", icon: "✕" },
};

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span
      className={`inline-flex h-5 items-center gap-1 rounded-[3px] px-1.5 text-[11px] font-bold uppercase leading-none motion-safe:transition-colors ${s.cls}`}
    >
      <span aria-hidden className="font-mono">
        {s.icon}
      </span>
      {verdict}
    </span>
  );
}

/** Arrow for the direction the number moved, coloured by whether that is good. */
export function DeltaText({ delta, text, className = "" }: { delta: Delta; text: string; className?: string }) {
  const arrow = delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "■";
  const tone = delta.effect === "better" ? "text-pass" : delta.effect === "worse" ? "text-fail" : "text-dim";
  const word = delta.effect === "better" ? "better" : delta.effect === "worse" ? "worse" : "within noise";
  return (
    <span className={`inline-flex items-baseline gap-1 font-mono text-xs ${tone} ${className}`}>
      <span aria-hidden className="text-[9px]">
        {arrow}
      </span>
      <span>{text}</span>
      <span className="font-sans">{word}</span>
    </span>
  );
}

/**
 * A plain section title. The kicker and intro text are kept in the callers'
 * code but no longer shown: the page is meant to be read from its numbers.
 */
export function SectionHeading({ id, title }: { id: string; kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <h2 id={id} className="-mx-4 -mt-4 mb-4 flex items-center justify-between border-b border-edge px-4 py-2.5 text-sm font-semibold">
      {title}
      <span aria-hidden className="text-faint">
        •••
      </span>
    </h2>
  );
}

/** A dashboard gadget: a framed card whose first SectionHeading becomes its title bar. */
export function Gadget({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-md border border-edge bg-panel p-4 shadow-card ${className}`}>{children}</div>;
}

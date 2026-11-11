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
    speed: "border-speed/40 bg-speed/10 text-speed",
    quality: "border-quality/40 bg-quality/10 text-quality",
    other: "border-edge-2 bg-panel-2 text-dim",
  };
  return (
    <span className={`inline-flex rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider ${styles[kind]}`}>
      {KIND_LABEL[kind]}
    </span>
  );
}

const VERDICT_STYLE: Record<Verdict, { cls: string; icon: string }> = {
  Healthy: { cls: "border-pass/40 bg-pass/10 text-pass", icon: "✓" },
  Watch: { cls: "border-warn/40 bg-warn/10 text-warn", icon: "!" },
  Regression: { cls: "border-fail/50 bg-fail/15 text-fail", icon: "✕" },
};

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold motion-safe:transition-colors ${s.cls}`}
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
    <h2 id={id} className="mb-3 border-b border-edge pb-2 text-base font-semibold">
      {title}
    </h2>
  );
}

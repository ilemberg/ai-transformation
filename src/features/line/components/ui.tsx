import { ACTORS } from "../stations";
import type { ActorId, Tier, Tone } from "../types";

export const TIER_TEXT: Record<Tier, string> = {
  small: "text-small",
  medium: "text-medium",
  large: "text-large",
};

export const TIER_BG: Record<Tier, string> = {
  small: "bg-small",
  medium: "bg-medium",
  large: "bg-large",
};

export function actorColor(id: ActorId): string {
  const actor = ACTORS[id];
  if (actor.kind === "human") return "text-human";
  if (actor.kind === "system") return "text-system";
  return TIER_TEXT[actor.tier ?? "medium"];
}

export function actorDot(id: ActorId): string {
  const actor = ACTORS[id];
  if (actor.kind === "human") return "bg-human";
  if (actor.kind === "system") return "bg-system";
  return TIER_BG[actor.tier ?? "medium"];
}

export function ActorChip({ id, showRole = false }: { id: ActorId; showRole?: boolean }) {
  const actor = ACTORS[id];
  const label =
    actor.kind === "agent" ? `${actor.tier} model` : actor.kind === "human" ? "person" : "automation";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-edge bg-panel-2 py-1 pl-2 pr-3 text-xs">
      <span aria-hidden className={`h-2 w-2 rounded-full ${actorDot(id)}`} />
      <span className="font-medium text-ink">{actor.name}</span>
      <span className={`${actorColor(id)}`}>{label}</span>
      {showRole && <span className="hidden text-faint sm:inline">· {actor.role}</span>}
    </span>
  );
}

export const TONE_MARK: Record<Tone, { mark: string; className: string; label: string }> = {
  pass: { mark: "✓", className: "text-pass", label: "passed" },
  fail: { mark: "✗", className: "text-fail", label: "failed" },
  warn: { mark: "!", className: "text-warn", label: "attention" },
  info: { mark: "→", className: "text-speed", label: "note" },
};

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-2xs uppercase tracking-[0.12em] text-faint">{children}</span>;
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-edge bg-panel/90 ${className}`}>{children}</div>;
}

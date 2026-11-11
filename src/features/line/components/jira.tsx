import { ACTORS } from "../stations";
import type { ActorId, TicketKind } from "../types";

/** Small square issue-type marks: story (green), bug (red), improvement (blue). */
export function IssueTypeIcon({ kind, className = "h-4 w-4" }: { kind: TicketKind; className?: string }) {
  const label = kind === "feature" ? "Story" : kind === "bug" ? "Bug" : kind === "task" ? "Task" : "Improvement";
  return (
    <svg viewBox="0 0 16 16" className={`${className} shrink-0`} role="img" aria-label={label}>
      <title>{label}</title>
      {kind === "feature" && (
        <>
          <rect width="16" height="16" rx="2" fill="#63ba3c" />
          <path d="M5 4h6v8.5L8 10.5l-3 2Z" fill="white" />
        </>
      )}
      {kind === "bug" && (
        <>
          <rect width="16" height="16" rx="2" fill="#e5493a" />
          <circle cx="8" cy="8" r="3.5" fill="white" />
        </>
      )}
      {kind === "task" && (
        <>
          <rect width="16" height="16" rx="2" fill="#4bade8" />
          <path d="M4.5 8.2 7 10.6l4.6-5" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === "performance" && (
        <>
          <rect width="16" height="16" rx="2" fill="#63ba3c" />
          <path d="M8 3.5 12 8H9.5v4.5h-3V8H4Z" fill="white" />
        </>
      )}
    </svg>
  );
}

/** Chevrons: two red for the highest priority, one orange for high. */
export function PriorityIcon({ priority }: { priority: string }) {
  const highest = priority === "P1";
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" role="img" aria-label={highest ? "Highest" : "High"}>
      <title>{highest ? "Highest priority" : "High priority"}</title>
      <path d="M3.5 10 8 5.5l4.5 4.5" fill="none" stroke={highest ? "#e5493a" : "#f79232"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {highest && (
        <path d="M3.5 13 8 8.5l4.5 4.5" fill="none" stroke="#e5493a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

const AVATAR_BG = {
  small: "bg-small",
  medium: "bg-medium",
  large: "bg-large",
} as const;

function initials(name: string): string {
  return name
    .replace(/agent|engineer|pipeline|controller|generator/gi, "")
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** A round avatar with initials, coloured by model size, person, or automation. */
export function Avatar({ id, size = 24 }: { id: ActorId; size?: number }) {
  const a = ACTORS[id];
  const bg = a.kind === "human" ? "bg-human" : a.kind === "system" ? "bg-system" : AVATAR_BG[a.tier ?? "medium"];
  return (
    <span
      title={`${a.name}${a.kind === "agent" ? ` (${a.tier} model)` : ""}`}
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-card ${bg} ${a.kind === "agent" ? "" : ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {a.kind === "system" ? "⚙" : initials(a.name) || a.name[0]}
    </span>
  );
}

export type LozengeTone = "neutral" | "info" | "success" | "danger" | "warning" | "purple";

const LOZENGE: Record<LozengeTone, string> = {
  neutral: "bg-neutral-bg text-dim",
  info: "bg-info-bg text-info-text",
  success: "bg-pass-bg text-pass-text",
  danger: "bg-fail-bg text-fail-text",
  warning: "bg-warn-bg text-warn",
  purple: "bg-purple-bg text-purple",
};

/** The small uppercase status pill. */
export function Lozenge({ tone, children }: { tone: LozengeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex h-4 items-center whitespace-nowrap rounded-[3px] px-1 text-[11px] font-bold uppercase leading-none ${LOZENGE[tone]}`}>
      {children}
    </span>
  );
}

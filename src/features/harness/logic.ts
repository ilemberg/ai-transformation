import { AREA_TIER, CHANGE_SIZE_POLICY, TIERS, type Area, type HarnessChange, type HarnessItem, type HarnessKind, type HarnessTask, type Night, type Tier } from "./data";

/** Newest first; on the same date, the higher version first. */
export function sortHistory(history: readonly HarnessChange[]): HarnessChange[] {
  return [...history].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return versionNumber(b.version) - versionNumber(a.version);
  });
}

function versionNumber(v: string): number {
  const m = /(\d+)\s*$/.exec(v);
  return m ? Number(m[1]) : 0;
}

/** The current state of an item is its newest change. */
export function latest(item: HarnessItem): HarnessChange {
  const [first] = sortHistory(item.history);
  if (!first) throw new Error(`${item.name} has no history`);
  return first;
}

export type ItemFilter = { kind: HarnessKind | "all"; failingOnly: boolean };

export function filterItems(items: readonly HarnessItem[], f: ItemFilter): HarnessItem[] {
  return items.filter((i) => (f.kind === "all" || i.kind === f.kind) && (!f.failingOnly || i.test === "fail"));
}

export function countByKind(items: readonly HarnessItem[]): Record<HarnessKind, number> {
  const out: Record<HarnessKind, number> = { instructions: 0, prompt: 0, skill: 0, tool: 0, policy: 0, eval: 0, guardrail: 0 };
  for (const i of items) out[i.kind] += 1;
  return out;
}

/** Pass rate in whole percent, one per night, oldest first. */
export function passRateTrend(nights: readonly Night[]): number[] {
  return nights.map((n) => (n.total === 0 ? 0 : Math.round((n.passed / n.total) * 100)));
}

export function taskTotals(tasks: readonly HarnessTask[]): { passed: number; total: number; ktokens: number; costUsd: number } {
  return {
    passed: tasks.filter((t) => t.pass).length,
    total: tasks.length,
    ktokens: tasks.reduce((s, t) => s + t.ktokens, 0),
    costUsd: Math.round(tasks.reduce((s, t) => s + t.costUsd, 0) * 100) / 100,
  };
}

/** A change takes the highest tier of any area it touches; touching nothing known is Standard. */
export function tierFor(areas: readonly Area[]): Tier {
  if (areas.length === 0) return "standard";
  return areas.map((a) => AREA_TIER[a]).reduce((hi, t) => (TIERS.indexOf(t) > TIERS.indexOf(hi) ? t : hi), "low" as Tier);
}

export function sizeCap(tier: Tier): number {
  return CHANGE_SIZE_POLICY.caps[tier];
}

/** "2026-11-10" → "10 Nov 2026"; short drops the year. */
export function formatDate(iso: string, short = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const base = `${d} ${months[(m ?? 1) - 1]}`;
  return short ? base : `${base} ${y}`;
}

import { COMPUTE_USD_PER_MINUTE, STATIONS, TIERS } from "./stations";
import { STATION_IDS, type ActorId, type LogLine, type StationId, type TestKind, type Ticket, type TicketStep, type Tier, type Usage } from "./types";

/**
 * Where playback is: which step of the ticket's route, and how many of that
 * step's log lines are showing. A route can visit a station more than once
 * (a failed gate sends the ticket back to Build), so steps and stations differ.
 */
export interface Cursor {
  step: number;
  shown: number;
}

export const LAST_STATION = STATION_IDS.length - 1;

export function stationIndex(id: StationId): number {
  return STATION_IDS.indexOf(id);
}

export function lastStep(ticket: Ticket): number {
  return ticket.steps.length - 1;
}

export function stepAt(ticket: Ticket, step: number): TicketStep {
  const s = ticket.steps[step];
  if (!s) throw new Error(`Ticket ${ticket.key} has no step ${step}`);
  return s;
}

/** The board column (station index) the ticket is in at the cursor. */
export function stationOf(ticket: Ticket, cursor: Cursor): number {
  return stationIndex(stepAt(ticket, cursor.step).station);
}

export function stationAt(station: number) {
  return STATIONS[station];
}

export function isStepDone(ticket: Ticket, cursor: Cursor): boolean {
  return cursor.shown >= stepAt(ticket, cursor.step).log.length;
}

export function isFinished(ticket: Ticket, cursor: Cursor): boolean {
  return cursor.step === lastStep(ticket) && isStepDone(ticket, cursor);
}

export const START: Cursor = { step: 0, shown: 0 };

/** One tick of playback: reveal the next log line, or move on to the next step. */
export function tick(ticket: Ticket, cursor: Cursor): Cursor | null {
  if (!isStepDone(ticket, cursor)) return { step: cursor.step, shown: cursor.shown + 1 };
  if (cursor.step >= lastStep(ticket)) return null;
  return { step: cursor.step + 1, shown: 0 };
}

/**
 * The order tickets take turns in when the board plays one event at a time.
 * A ticket with pace 2 gets two turns per round, spread out.
 */
export function turnOrder(tickets: Ticket[]): string[] {
  const rounds = Math.max(1, ...tickets.map((t) => t.pace ?? 1));
  const order: string[] = [];
  for (let r = 0; r < rounds; r++) for (const t of tickets) if ((t.pace ?? 1) > r) order.push(t.id);
  return order;
}

/** What changed for one ticket in one event, so the screen can point at it. */
export interface BoardEvent {
  seq: number;
  ticketId: string;
  before: Cursor;
  after: Cursor;
  /** The ticket changed column. */
  moved: boolean;
  /** It changed column backwards: a gate sent it back. */
  movedBack: boolean;
  line: LogLine | null;
  tests: TestKind[];
  assigneeChanged: boolean;
}

export function describeChange(ticket: Ticket, before: Cursor, after: Cursor, seq: number): BoardEvent {
  const from = stationOf(ticket, before);
  const to = stationOf(ticket, after);
  const stepChanged = before.step !== after.step;
  const line = !stepChanged && after.shown > before.shown ? (stepAt(ticket, after.step).log[after.shown - 1] ?? null) : null;
  const tests = (Object.keys(ticket.tests) as TestKind[]).filter(
    (k) => testState(ticket, k, before) !== testState(ticket, k, after),
  );
  return {
    seq,
    ticketId: ticket.id,
    before,
    after,
    moved: from !== to,
    movedBack: to < from,
    line,
    tests,
    assigneeChanged: assigneeAt(ticket, before) !== assigneeAt(ticket, after),
  };
}

/**
 * One event for the whole board: the next ticket in turn that is not finished
 * takes one step. Returns null once every ticket is finished.
 */
export function stepOne(
  tickets: Ticket[],
  cursors: Record<string, Cursor>,
  turn: number,
  seq: number,
): { cursors: Record<string, Cursor>; turn: number; event: BoardEvent } | null {
  const order = turnOrder(tickets);
  for (let k = 0; k < order.length; k++) {
    const pos = (turn + k) % order.length;
    const ticket = tickets.find((t) => t.id === order[pos])!;
    const before = cursors[ticket.id] ?? START;
    const after = tick(ticket, before);
    if (after) {
      return {
        cursors: { ...cursors, [ticket.id]: after },
        turn: pos + 1,
        event: describeChange(ticket, before, after, seq),
      };
    }
  }
  return null;
}

/** Who has the ticket right now: whoever wrote the latest line, or the station's first worker. */
export function assigneeAt(ticket: Ticket, cursor: Cursor): ActorId {
  const step = stepAt(ticket, cursor.step);
  const last = step.log[cursor.shown - 1];
  return last ? last.who : STATIONS[stationIndex(step.station)].actors[0];
}

/** Jump to a step with all its lines showing (manual stepping). */
export function jumpTo(ticket: Ticket, step: number): Cursor {
  const clamped = Math.max(0, Math.min(lastStep(ticket), step));
  return { step: clamped, shown: stepAt(ticket, clamped).log.length };
}

/** Jump to the first visit of a station (from the status menu). Null if the route never goes there. */
export function jumpToStation(ticket: Ticket, station: number): Cursor | null {
  const step = ticket.steps.findIndex((s) => stationIndex(s.station) === station);
  return step < 0 ? null : jumpTo(ticket, step);
}

export type TestState = "na" | "none" | "red" | "green";

/**
 * A kind of test shows nothing until the route reaches the station that
 * writes it, then red, then green once the station that makes it pass has
 * finished. A step can also turn a kind red or green when it finishes (a
 * failed eval run, a rollback) through its `sets`.
 */
export function testState(ticket: Ticket, kind: TestKind, cursor: Cursor): TestState {
  const tests = ticket.tests[kind];
  if (!tests) return "na";
  let state: TestState = "none";
  for (let i = 0; i <= cursor.step; i++) {
    const step = ticket.steps[i];
    const done = i < cursor.step || isStepDone(ticket, cursor);
    if (state === "none" && step.station === tests.writtenAt) state = "red";
    if (done && step.station === tests.greenAt && state !== "none") state = "green";
    const set = done ? step.sets?.[kind] : undefined;
    if (set) state = set;
  }
  return state;
}

export interface Totals {
  ktokens: Record<Tier, number>;
  aiUsd: number;
  computeUsd: number;
  wallMinutes: number;
  humanMinutes: number;
}

export function emptyTotals(): Totals {
  return { ktokens: { small: 0, medium: 0, large: 0 }, aiUsd: 0, computeUsd: 0, wallMinutes: 0, humanMinutes: 0 };
}

const PRICE: Record<Tier, number> = Object.fromEntries(TIERS.map((t) => [t.id, t.usdPerMillion])) as Record<
  Tier,
  number
>;

function addUsage(totals: Totals, usage: Usage, share: number): Totals {
  const ktokens = { ...totals.ktokens };
  let aiUsd = totals.aiUsd;
  for (const tier of ["small", "medium", "large"] as const) {
    const k = (usage.ktokens[tier] ?? 0) * share;
    ktokens[tier] += k;
    aiUsd += (k / 1000) * PRICE[tier];
  }
  return {
    ktokens,
    aiUsd,
    computeUsd: totals.computeUsd + usage.computeMinutes * share * COMPUTE_USD_PER_MINUTE,
    wallMinutes: totals.wallMinutes + usage.wallMinutes * share,
    humanMinutes: totals.humanMinutes + usage.humanMinutes * share,
  };
}

/**
 * Cost and time spent up to the cursor. Earlier steps count in full; the
 * current step counts in proportion to how many of its lines are showing.
 */
export function totalsAt(ticket: Ticket, cursor: Cursor): Totals {
  let totals = emptyTotals();
  for (let i = 0; i <= cursor.step; i++) {
    const step = stepAt(ticket, i);
    const lines = step.log.length;
    const share = i < cursor.step ? 1 : lines === 0 ? 1 : Math.min(1, cursor.shown / lines);
    totals = addUsage(totals, step.usage, share);
  }
  return totals;
}

export function totalsFor(ticket: Ticket): Totals {
  return totalsAt(ticket, jumpTo(ticket, lastStep(ticket)));
}

/** "45 min", "1 h 35 min", "1 day", "7 days". Used for elapsed time. */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  if (m < 60 * 24) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
  }
  const days = Math.round((m / (60 * 24)) * 10) / 10;
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export function formatUsd(usd: number): string {
  if (usd < 10) return `$${usd.toFixed(2)}`;
  return `$${Math.round(usd).toLocaleString("en-US")}`;
}

export function formatTokens(ktokens: number): string {
  if (ktokens < 1000) return `${Math.round(ktokens)}k`;
  return `${(ktokens / 1000).toFixed(1)}M`;
}

/** Share of all tokens so far handled by each model size, as fractions summing to 1 (or all 0). */
export function tierShares(totals: Totals): Record<Tier, number> {
  const sum = totals.ktokens.small + totals.ktokens.medium + totals.ktokens.large;
  if (sum === 0) return { small: 0, medium: 0, large: 0 };
  return {
    small: totals.ktokens.small / sum,
    medium: totals.ktokens.medium / sum,
    large: totals.ktokens.large / sum,
  };
}

/** Read a ticket and step (1-based) from the address bar, falling back to the first ticket at the start. */
export function parseLocation(
  tickets: Ticket[],
  t: string | undefined,
  s: string | undefined,
): { ticketId: string; step: number | null } {
  const ticket = tickets.find((x) => x.id === t) ?? tickets[0];
  const n = s === undefined ? NaN : Number.parseInt(s, 10);
  const step = Number.isInteger(n) && n >= 1 && n <= ticket.steps.length ? n - 1 : null;
  return { ticketId: ticket.id, step };
}

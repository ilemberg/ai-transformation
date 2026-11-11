/**
 * Bookwell in production: traces, model calls, journey health, alerts and
 * weekly answer scoring. Ticket keys, run ids and numbers match the board
 * (src/features/line/tickets.ts) and the Runs page:
 * - BW-142 rebooking assistant: prompt v3, 2.1k tokens, $0.004, 1 tool call, p95 640 ms.
 * - BW-158 model upgrade: 10% canary p95 2.3 s, rolled back in 4 minutes, old model took over.
 * - BW-311 double charge: deploy 2026.11.09-3, 7 customers, ack 3 min, restore 52 min, fix 3 h 20 min.
 */
import { errorBudgetMinutes, type SeriesEvent } from "./logic";

// ---------- traces ----------

export type SpanKind = "edge" | "gateway" | "service" | "cache" | "model" | "tool" | "external" | "db";
export type SpanStatus = "ok" | "slow" | "error";
export type ModelTier = "small" | "medium" | "large";

export type Span = {
  id: string;
  parent?: string;
  service: string;
  name: string;
  kind: SpanKind;
  /** Milliseconds from the start of the trace. */
  start: number;
  duration: number;
  status: SpanStatus;
  tier?: ModelTier;
  attrs: [string, string][];
};

export type TraceStatus = "ok" | "slow" | "fallback" | "error";

export type Trace = {
  id: string;
  label: string;
  status: TraceStatus;
  at: string;
  request: string;
  release: string;
  ticket: string;
  /** The span selected when the trace opens. */
  focus: string;
  spans: Span[];
};

const REBOOK_PATH = "POST /v2/rebooking/suggest";

const NORMAL: Trace = {
  id: "tr_9c41e2",
  label: "Rebooking after a hotel cancels",
  status: "ok",
  at: "Tue 3 Nov 2026, 13:48:12",
  request: REBOOK_PATH,
  release: "2026.11.03-2",
  ticket: "BW-142",
  focus: "model",
  spans: [
    { id: "edge", service: "edge", name: REBOOK_PATH, kind: "edge", start: 0, duration: 640, status: "ok", attrs: [["http.status", "200"], ["region", "eu-west"], ["client", "web"], ["release", "2026.11.03-2"]] },
    { id: "gw", parent: "edge", service: "api-gateway", name: "auth · rate limit · route", kind: "gateway", start: 6, duration: 628, status: "ok", attrs: [["auth", "session ok"], ["rate_limit", "312 of 600 / min"], ["route", "rebooking-service"]] },
    { id: "rb", parent: "gw", service: "rebooking-service", name: "suggest alternatives", kind: "service", start: 14, duration: 612, status: "ok", attrs: [["booking", "bk_44f1"], ["reason", "hotel cancelled"], ["flag", "rebooking-assistant: on"], ["suggestions", "3"]] },
    { id: "pol", parent: "rb", service: "policy-service", name: "per-night cap and loyalty", kind: "service", start: 20, duration: 42, status: "ok", attrs: [["cap", "$240 per night"], ["loyalty", "gold tier"], ["rules_checked", "7"]] },
    { id: "hs", parent: "rb", service: "hotel-search", name: "hotels within 2 miles, same nights", kind: "service", start: 64, duration: 48, status: "ok", attrs: [["results", "41"], ["rate_lookups", "1 batched"], ["cache", "hit"]] },
    { id: "hs-cache", parent: "hs", service: "hotel-search", name: "rate cache get", kind: "cache", start: 66, duration: 4, status: "ok", attrs: [["cache", "hit"], ["key", "city + nights + company"], ["ttl_left", "3 min 12 s"]] },
    { id: "mg", parent: "rb", service: "model-gateway", name: "rank and explain", kind: "gateway", start: 116, duration: 450, status: "ok", attrs: [["route", "previous model (99%)"], ["timeout", "none"], ["budget", "$0.01 per answer"]] },
    {
      id: "model",
      parent: "mg",
      service: "model provider",
      name: "model call · rebook-v3",
      kind: "model",
      tier: "medium",
      start: 124,
      duration: 436,
      status: "ok",
      attrs: [
        ["prompt", "rebook-v3"],
        ["model", "Medium model (previous)"],
        ["tier", "medium"],
        ["tokens_in", "1,840"],
        ["tokens_out", "260"],
        ["tokens_total", "2.1k"],
        ["cost", "$0.004"],
        ["tool_calls", "1"],
        ["prompt_cache", "hit"],
        ["eval_sampled", "yes · score 95"],
      ],
    },
    { id: "tool", parent: "mg", service: "rebooking-service", name: "tool · check_loyalty_rate", kind: "tool", start: 300, duration: 28, status: "ok", attrs: [["tool", "check_loyalty_rate"], ["hotels", "3"], ["result", "2 of 3 earn points"]] },
    { id: "price", parent: "rb", service: "booking-service", name: "price re-check", kind: "service", start: 570, duration: 48, status: "ok", attrs: [["hotels", "3"], ["currency", "USD"], ["changed", "0 of 3"]] },
    { id: "resp", parent: "rb", service: "rebooking-service", name: "response · 3 alternatives", kind: "service", start: 620, duration: 6, status: "ok", attrs: [["bytes", "4.2 KB"], ["within_policy", "3 of 3"]] },
  ],
};

const SLOW: Trace = {
  id: "tr_5b07d4",
  label: "Same request on the BW-158 canary",
  status: "slow",
  at: "Tue 3 Nov 2026, 14:21:07",
  request: REBOOK_PATH,
  release: "2026.11.03-4 (canary 10%)",
  ticket: "BW-158",
  focus: "model",
  spans: [
    { id: "edge", service: "edge", name: REBOOK_PATH, kind: "edge", start: 0, duration: 2530, status: "slow", attrs: [["http.status", "200"], ["region", "eu-west"], ["client", "mobile"], ["release", "2026.11.03-4 (canary 10%)"]] },
    { id: "gw", parent: "edge", service: "api-gateway", name: "auth · rate limit · route", kind: "gateway", start: 5, duration: 2520, status: "slow", attrs: [["auth", "session ok"], ["route", "rebooking-service"]] },
    { id: "rb", parent: "gw", service: "rebooking-service", name: "suggest alternatives", kind: "service", start: 12, duration: 2506, status: "slow", attrs: [["booking", "bk_45a0"], ["reason", "hotel cancelled"], ["suggestions", "3"]] },
    { id: "pol", parent: "rb", service: "policy-service", name: "per-night cap and loyalty", kind: "service", start: 18, duration: 40, status: "ok", attrs: [["cap", "$210 per night"], ["loyalty", "silver tier"]] },
    { id: "hs", parent: "rb", service: "hotel-search", name: "hotels within 2 miles, same nights", kind: "service", start: 60, duration: 52, status: "ok", attrs: [["results", "33"], ["cache", "hit"]] },
    { id: "hs-cache", parent: "hs", service: "hotel-search", name: "rate cache get", kind: "cache", start: 62, duration: 5, status: "ok", attrs: [["cache", "hit"]] },
    { id: "mg", parent: "rb", service: "model-gateway", name: "rank and explain", kind: "gateway", start: 116, duration: 2340, status: "slow", attrs: [["route", "new model (canary 10%)"], ["timeout", "none (added after this rollback)"], ["slo_burn_1h", "6x"]] },
    {
      id: "model",
      parent: "mg",
      service: "model provider",
      name: "model call · rebook-v4",
      kind: "model",
      tier: "medium",
      start: 122,
      duration: 2300,
      status: "slow",
      attrs: [
        ["prompt", "rebook-v4"],
        ["model", "Medium model (new, canary)"],
        ["tier", "medium"],
        ["provider_latency", "2.3 s (region busy)"],
        ["tokens_in", "1,910"],
        ["tokens_out", "240"],
        ["cost", "$0.003"],
        ["tool_calls", "1"],
        ["outcome", "answered, over the 1.2 s budget"],
        ["rollback", "automatic at 14:24, 4 min after 10%"],
      ],
    },
    { id: "tool", parent: "mg", service: "rebooking-service", name: "tool · check_loyalty_rate", kind: "tool", start: 1880, duration: 30, status: "ok", attrs: [["tool", "check_loyalty_rate"], ["hotels", "3"]] },
    { id: "price", parent: "rb", service: "booking-service", name: "price re-check", kind: "service", start: 2460, duration: 46, status: "ok", attrs: [["hotels", "3"], ["changed", "1 of 3"]] },
    { id: "resp", parent: "rb", service: "rebooking-service", name: "response · 3 alternatives", kind: "service", start: 2510, duration: 8, status: "ok", attrs: [["within_policy", "3 of 3"]] },
  ],
};

const FALLBACK: Trace = {
  id: "tr_5b0e91",
  label: "After the rollback: old model took over",
  status: "fallback",
  at: "Tue 3 Nov 2026, 14:25:12",
  request: REBOOK_PATH,
  release: "2026.11.03-2 (rolled back to)",
  ticket: "BW-158",
  focus: "mg",
  spans: [
    { id: "edge", service: "edge", name: REBOOK_PATH, kind: "edge", start: 0, duration: 688, status: "ok", attrs: [["http.status", "200"], ["region", "eu-west"], ["client", "web"], ["release", "2026.11.03-2"]] },
    { id: "gw", parent: "edge", service: "api-gateway", name: "auth · rate limit · route", kind: "gateway", start: 6, duration: 676, status: "ok", attrs: [["auth", "session ok"], ["route", "rebooking-service"]] },
    { id: "rb", parent: "gw", service: "rebooking-service", name: "suggest alternatives", kind: "service", start: 13, duration: 662, status: "ok", attrs: [["booking", "bk_45b7"], ["reason", "hotel cancelled"], ["suggestions", "3"]] },
    { id: "pol", parent: "rb", service: "policy-service", name: "per-night cap and loyalty", kind: "service", start: 19, duration: 44, status: "ok", attrs: [["cap", "$240 per night"], ["loyalty", "none"]] },
    { id: "hs", parent: "rb", service: "hotel-search", name: "hotels within 2 miles, same nights", kind: "service", start: 66, duration: 61, status: "ok", attrs: [["results", "27"], ["cache", "miss"], ["rate_lookups", "1 batched"]] },
    { id: "hs-db", parent: "hs", service: "hotel-search", name: "rates query", kind: "db", start: 70, duration: 49, status: "ok", attrs: [["rows", "27"], ["cache", "miss, now stored 5 min"]] },
    { id: "mg", parent: "rb", service: "model-gateway", name: "rank and explain", kind: "gateway", start: 130, duration: 496, status: "ok", attrs: [["route", "previous model (fallback)"], ["fallback", "yes"], ["reason", "BW-158 canary rolled back at 14:24"], ["customer_error", "none"]] },
    {
      id: "model",
      parent: "mg",
      service: "model provider",
      name: "model call · rebook-v3",
      kind: "model",
      tier: "medium",
      start: 136,
      duration: 488,
      status: "ok",
      attrs: [
        ["prompt", "rebook-v3"],
        ["model", "Medium model (previous)"],
        ["tier", "medium"],
        ["tokens_in", "1,820"],
        ["tokens_out", "250"],
        ["cost", "$0.004"],
        ["tool_calls", "1"],
        ["fallback", "yes"],
      ],
    },
    { id: "tool", parent: "mg", service: "rebooking-service", name: "tool · check_loyalty_rate", kind: "tool", start: 350, duration: 26, status: "ok", attrs: [["tool", "check_loyalty_rate"], ["hotels", "3"]] },
    { id: "price", parent: "rb", service: "booking-service", name: "price re-check", kind: "service", start: 628, duration: 40, status: "ok", attrs: [["hotels", "3"], ["changed", "0 of 3"]] },
    { id: "resp", parent: "rb", service: "rebooking-service", name: "response · 3 alternatives", kind: "service", start: 669, duration: 6, status: "ok", attrs: [["within_policy", "3 of 3"]] },
  ],
};

const ERROR: Trace = {
  id: "tr_e30a17",
  label: "Checkout charged twice",
  status: "error",
  at: "Mon 9 Nov 2026, 10:58:41",
  request: "POST /v2/checkout/pay",
  release: "2026.11.09-3",
  ticket: "BW-311",
  focus: "charge-2",
  spans: [
    { id: "edge", service: "edge", name: "POST /v2/checkout/pay", kind: "edge", start: 0, duration: 6180, status: "error", attrs: [["http.status", "200"], ["client", "web"], ["release", "2026.11.09-3"], ["alert", "payment.duplicate_charge"]] },
    { id: "gw", parent: "edge", service: "api-gateway", name: "auth · rate limit · route", kind: "gateway", start: 4, duration: 6172, status: "ok", attrs: [["auth", "session ok"], ["route", "booking-service"]] },
    { id: "bk", parent: "gw", service: "booking-service", name: "confirm booking", kind: "service", start: 10, duration: 6160, status: "error", attrs: [["booking", "bk_51c2"], ["amount", "$612.40"], ["flag", "retry-on-timeout: on"]] },
    { id: "pay", parent: "bk", service: "payments-service", name: "charge card", kind: "service", start: 18, duration: 5934, status: "error", attrs: [["attempts", "2"], ["idempotency_key", "missing"], ["charges_settled", "2"]] },
    { id: "charge-1", parent: "pay", service: "payment provider", name: "charge · attempt 1 (3-D Secure)", kind: "external", start: 24, duration: 5000, status: "error", attrs: [["result", "timeout after 5.0 s"], ["idempotency_key", "none"], ["provider_outcome", "settled after the timeout"]] },
    { id: "charge-2", parent: "pay", service: "payment provider", name: "charge · attempt 2 (retry)", kind: "external", start: 5032, duration: 860, status: "error", attrs: [["result", "charged"], ["idempotency_key", "none"], ["duplicate_of", "attempt 1"], ["cause", "retry after a 3-D Secure timeout reuses no idempotency key"]] },
    { id: "ledger", parent: "pay", service: "payments-service", name: "ledger write", kind: "db", start: 5900, duration: 46, status: "ok", attrs: [["entries", "2"]] },
    { id: "resp", parent: "bk", service: "booking-service", name: "response · booking confirmed", kind: "service", start: 6156, duration: 12, status: "ok", attrs: [["shown_to_traveller", "one charge"]] },
  ],
};

export const TRACES: Trace[] = [NORMAL, SLOW, FALLBACK, ERROR];

export const TRACE_IDS: readonly string[] = TRACES.map((t) => t.id);

export const DEFAULT_TRACE_ID = NORMAL.id;

/** Link to a trace on this page, e.g. from Runs or the board. */
export function traceHref(id: string): string {
  return `/observe?trace=${encodeURIComponent(id)}#trace`;
}

export function traceById(id: string): Trace {
  return TRACES.find((t) => t.id === id) ?? NORMAL;
}

// ---------- model calls ----------

export type CallOutcome = "ok" | "slow" | "fallback" | "error";

export type ModelCall = {
  id: string;
  at: string;
  feature: string;
  tier: ModelTier;
  model: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  cacheHit: boolean;
  fallback: boolean;
  outcome: CallOutcome;
  /** Present when the call was sampled for scoring, 0 to 100. */
  evalScore?: number;
  trace?: string;
};

const RB = "Rebooking assistant";
const TT = "Ticket triage";
const CR = "Code review agent";
const SR = "Search ranking";
const PREV = "Medium model (previous)";
const NEW = "Medium model (new, canary)";

function call(
  id: string,
  at: string,
  feature: string,
  tier: ModelTier,
  model: string,
  latencyMs: number,
  tokensIn: number,
  tokensOut: number,
  costUsd: number,
  extra: Partial<Pick<ModelCall, "cacheHit" | "fallback" | "outcome" | "evalScore" | "trace">> = {},
): ModelCall {
  return { id, at, feature, tier, model, latencyMs, tokensIn, tokensOut, costUsd, cacheHit: false, fallback: false, outcome: "ok", ...extra };
}

/** Tue 3 Nov 2026, 13:40 to 14:40: one hour around the BW-158 canary and its rollback. */
export const MODEL_CALLS: ModelCall[] = [
  call("mc_01", "13:40:02", SR, "small", "Small model", 92, 610, 40, 0.0002, { cacheHit: true }),
  call("mc_02", "13:41:15", TT, "small", "Small model", 380, 1900, 120, 0.0006, { evalScore: 96 }),
  call("mc_03", "13:43:50", CR, "large", "Large model", 8400, 24000, 1800, 0.112, { evalScore: 88 }),
  call("mc_04", "13:45:31", RB, "medium", PREV, 512, 1780, 250, 0.004),
  call("mc_05", "13:48:12", RB, "medium", PREV, 436, 1840, 260, 0.004, { cacheHit: true, evalScore: 95, trace: "tr_9c41e2" }),
  call("mc_06", "13:52:40", SR, "small", "Small model", 88, 590, 40, 0.0002, { cacheHit: true }),
  call("mc_07", "13:55:03", SR, "small", "Small model", 140, 640, 44, 0.0002),
  call("mc_08", "13:58:19", TT, "small", "Small model", 410, 2050, 130, 0.0007),
  call("mc_09", "14:02:44", RB, "medium", PREV, 598, 1880, 270, 0.004),
  call("mc_10", "14:06:10", CR, "large", "Large model", 11200, 31000, 2400, 0.146, { evalScore: 91 }),
  call("mc_11", "14:09:57", SR, "small", "Small model", 95, 600, 40, 0.0002, { cacheHit: true }),
  call("mc_12", "14:12:30", RB, "medium", PREV, 471, 1800, 255, 0.004, { cacheHit: true, evalScore: 100 }),
  call("mc_13", "14:16:02", TT, "small", "Small model", 1050, 1980, 0, 0.0005, { outcome: "error" }),
  call("mc_14", "14:20:41", RB, "medium", NEW, 1920, 1890, 235, 0.003, { outcome: "slow" }),
  call("mc_15", "14:21:07", RB, "medium", NEW, 2300, 1910, 240, 0.003, { outcome: "slow", trace: "tr_5b07d4" }),
  call("mc_16", "14:22:33", RB, "medium", NEW, 2410, 1870, 250, 0.003, { outcome: "slow", evalScore: 100 }),
  call("mc_17", "14:23:15", SR, "small", "Small model", 101, 620, 42, 0.0002),
  call("mc_18", "14:24:50", RB, "medium", PREV, 520, 1850, 260, 0.004, { fallback: true, outcome: "fallback" }),
  call("mc_19", "14:25:12", RB, "medium", PREV, 488, 1820, 250, 0.004, { fallback: true, outcome: "fallback", trace: "tr_5b0e91" }),
  call("mc_20", "14:26:40", RB, "medium", PREV, 545, 1900, 265, 0.004, { fallback: true, outcome: "fallback", evalScore: 90 }),
  call("mc_21", "14:28:02", TT, "small", "Small model", 360, 1850, 110, 0.0006),
  call("mc_22", "14:30:18", SR, "small", "Small model", 90, 600, 40, 0.0002, { cacheHit: true }),
  call("mc_23", "14:33:45", CR, "large", "Large model", 9100, 27000, 2000, 0.126, { evalScore: 85 }),
  call("mc_24", "14:36:09", RB, "medium", PREV, 503, 1830, 255, 0.004, { fallback: true, outcome: "fallback", cacheHit: true }),
  call("mc_25", "14:39:30", SR, "small", "Small model", 97, 610, 40, 0.0002, { cacheHit: true }),
];

// ---------- service health ----------

export const SLO_TARGET = 99.9;
export const BUDGET_DAYS = 30;
export const BUDGET_MINUTES = errorBudgetMinutes(SLO_TARGET, BUDGET_DAYS);

export type Marker = { at: string; label: string; tone: "deploy" | "rollback" | "alert" | "flag" };

export type DayId = "2026-11-03" | "2026-11-09";

export const DAYS: { id: DayId; label: string }[] = [
  { id: "2026-11-03", label: "Tue 3 Nov · BW-158 canary" },
  { id: "2026-11-09", label: "Mon 9 Nov · BW-311" },
];

export type Journey = {
  id: string;
  name: string;
  /** Successful requests over all requests, last 30 days. */
  uptimePct: number;
  /** Share of requests failing over the last hour and six hours, in %. */
  errorPct1h: number;
  errorPct6h: number;
  baseLatencyMs: number;
  baseErrorPct: number;
  days: Record<DayId, { events: SeriesEvent[]; markers: Marker[] }>;
};

export const JOURNEYS: Journey[] = [
  {
    id: "search",
    name: "Search hotels",
    uptimePct: 99.96,
    errorPct1h: 0.21,
    errorPct6h: 0.12,
    baseLatencyMs: 610,
    baseErrorPct: 0.03,
    days: {
      "2026-11-03": { events: [], markers: [{ at: "10:30", label: "Deploy 2026.11.03-1", tone: "deploy" }] },
      "2026-11-09": {
        events: [{ from: "08:00", to: "09:30", latencyMs: 720 }],
        markers: [{ at: "16:05", label: "Deploy 2026.11.09-5", tone: "deploy" }],
      },
    },
  },
  {
    id: "book",
    name: "Book",
    uptimePct: 99.95,
    errorPct1h: 0.03,
    errorPct6h: 0.05,
    baseLatencyMs: 420,
    baseErrorPct: 0.03,
    days: {
      "2026-11-03": { events: [], markers: [{ at: "11:10", label: "Deploy 2026.11.03-2", tone: "deploy" }] },
      "2026-11-09": {
        events: [{ from: "11:00", to: "11:45", errorPct: 1.2 }],
        markers: [{ at: "11:14", label: "Alert: checkout errors > 1%", tone: "alert" }],
      },
    },
  },
  {
    id: "pay",
    name: "Pay",
    uptimePct: 99.94,
    errorPct1h: 0.04,
    errorPct6h: 0.06,
    baseLatencyMs: 900,
    baseErrorPct: 0.04,
    days: {
      "2026-11-03": { events: [], markers: [] },
      "2026-11-09": {
        events: [{ from: "10:45", to: "11:45", latencyMs: 5100, errorPct: 0.6 }],
        markers: [
          { at: "10:47", label: "Deploy 2026.11.09-3", tone: "deploy" },
          { at: "11:02", label: "Alert: duplicate charge", tone: "alert" },
          { at: "11:34", label: "Retry-on-timeout flag off", tone: "flag" },
          { at: "14:12", label: "Fix at 100%", tone: "deploy" },
        ],
      },
    },
  },
  {
    id: "rebook",
    name: "Rebook",
    uptimePct: 99.97,
    errorPct1h: 0.02,
    errorPct6h: 0.03,
    baseLatencyMs: 640,
    baseErrorPct: 0.02,
    days: {
      "2026-11-03": {
        events: [{ from: "14:15", to: "14:30", latencyMs: 2300 }],
        markers: [
          { at: "12:05", label: "BW-158 canary 1%", tone: "deploy" },
          { at: "14:20", label: "BW-158 canary 10%", tone: "deploy" },
          { at: "14:24", label: "Rolled back (4 min)", tone: "rollback" },
        ],
      },
      "2026-11-09": { events: [], markers: [] },
    },
  },
  {
    id: "cancel",
    name: "Cancel",
    uptimePct: 99.98,
    errorPct1h: 0.01,
    errorPct6h: 0.02,
    baseLatencyMs: 350,
    baseErrorPct: 0.01,
    days: {
      "2026-11-03": { events: [], markers: [] },
      "2026-11-09": { events: [], markers: [{ at: "13:40", label: "Deploy 2026.11.09-4", tone: "deploy" }] },
    },
  },
];

// ---------- alerts ----------

export type Alert = {
  id: string;
  name: string;
  service: string;
  severity: "page" | "ticket";
  /** ISO time the alert fired. */
  firedAt: string;
  fired: string;
  ackMinutes: number;
  actionable: boolean;
  note: string;
  ticket?: string;
  trace?: string;
};

/** "Now" for the alert stats: Wed 11 Nov 2026, 09:00. */
export const ALERTS_NOW = "2026-11-11T09:00:00Z";

export const ALERTS: Alert[] = [
  { id: "al_9", name: "hotel-search p95 > 800 ms for 5 min", service: "hotel-search", severity: "ticket", firedAt: "2026-11-10T08:04:00Z", fired: "Tue 10 Nov 08:04", ackMinutes: 9, actionable: false, note: "Monday-style peak; cleared in 6 min" },
  { id: "al_8", name: "checkout errors > 1% for 5 min", service: "booking-service", severity: "page", firedAt: "2026-11-09T11:14:00Z", fired: "Mon 9 Nov 11:14", ackMinutes: 1, actionable: false, note: "Same incident as the duplicate charge", ticket: "BW-311" },
  { id: "al_7", name: "payment.duplicate_charge > 0 for 10 min", service: "payments-service", severity: "page", firedAt: "2026-11-09T11:02:00Z", fired: "Mon 9 Nov 11:02", ackMinutes: 3, actionable: true, note: "7 customers; stopgap flag off", ticket: "BW-311", trace: "tr_e30a17" },
  { id: "al_6", name: "log node disk > 85%", service: "platform", severity: "page", firedAt: "2026-11-08T02:31:00Z", fired: "Sun 8 Nov 02:31", ackMinutes: 14, actionable: false, note: "Rotation ran on its own; threshold raised" },
  { id: "al_5", name: "model fallback rate > 10% for 15 min", service: "model-gateway", severity: "page", firedAt: "2026-11-07T19:40:00Z", fired: "Sat 7 Nov 19:40", ackMinutes: 4, actionable: true, note: "Provider region busy; old model served, no errors", ticket: "BW-158" },
  { id: "al_4", name: "push delivery errors > 2%", service: "mobile-push", severity: "ticket", firedAt: "2026-11-06T15:02:00Z", fired: "Fri 6 Nov 15:02", ackMinutes: 11, actionable: false, note: "Push provider incident" },
  { id: "al_3", name: "confirmation email queue > 5 min", service: "booking-service", severity: "ticket", firedAt: "2026-11-05T09:20:00Z", fired: "Thu 5 Nov 09:20", ackMinutes: 7, actionable: true, note: "Worker count raised from 2 to 4" },
  { id: "al_2", name: "rebook latency SLO burn 6x (1 h)", service: "model-gateway", severity: "page", firedAt: "2026-11-03T14:24:00Z", fired: "Tue 3 Nov 14:24", ackMinutes: 2, actionable: true, note: "Canary rolled back automatically in 4 min", ticket: "BW-158", trace: "tr_5b07d4" },
];

export type TimelineEvent = { at: string; text: string; tone: "neutral" | "fail" | "warn" | "pass" | "info"; trace?: string };

/** BW-311, Mon 9 Nov 2026. */
export const INCIDENT = {
  ticket: "BW-311",
  title: "Payments: travellers charged twice after a 3-D Secure timeout",
  impactStart: "10:52",
  restored: "11:44",
  customers: 7,
  timeToFix: "3 h 20 min",
  events: [
    { at: "10:47", text: "Deploy 2026.11.09-3 reaches 100%.", tone: "neutral" },
    { at: "10:52", text: "First duplicate charge.", tone: "fail" },
    { at: "11:02", text: "Alert fired: payment.duplicate_charge > 0 for 10 minutes.", tone: "fail" },
    { at: "11:03", text: "BW-311 opened automatically with the 7 traces, the deploy and the agent run that wrote the change.", tone: "info", trace: "tr_e30a17" },
    { at: "11:05", text: "On-call acknowledged (3 min).", tone: "warn" },
    { at: "11:34", text: "Stopgap: retry-on-timeout flag turned off.", tone: "warn" },
    { at: "11:44", text: "No duplicate charges for 10 minutes. Restored.", tone: "pass" },
    { at: "14:12", text: "Fix with an idempotency key on every charge: 5% canary for 15 minutes, then 100%. Flag back on.", tone: "pass" },
    { at: "Tue 16:00", text: "Blameless review published; new gate: payment code needs an idempotency test. Closed.", tone: "pass" },
  ] satisfies TimelineEvent[],
};

// ---------- quality in production ----------

export const RELEASE_THRESHOLD = 92;
export const SAMPLE_SIZE = 200;

export type QualityWeek = { week: string; starts: string; passed: number; sampled: number };

export const QUALITY_WEEKS: QualityWeek[] = [
  { week: "W38", starts: "14 Sep", passed: 186, sampled: SAMPLE_SIZE },
  { week: "W39", starts: "21 Sep", passed: 187, sampled: SAMPLE_SIZE },
  { week: "W40", starts: "28 Sep", passed: 185, sampled: SAMPLE_SIZE },
  { week: "W41", starts: "5 Oct", passed: 187, sampled: SAMPLE_SIZE },
  { week: "W42", starts: "12 Oct", passed: 186, sampled: SAMPLE_SIZE },
  { week: "W43", starts: "19 Oct", passed: 188, sampled: SAMPLE_SIZE },
  { week: "W44", starts: "26 Oct", passed: 186, sampled: SAMPLE_SIZE },
  { week: "W45", starts: "2 Nov", passed: 189, sampled: SAMPLE_SIZE },
];

/** The week BW-158's new model reached 100% (Thu 5 Nov). */
export const DRIFT_WEEK = "W45";

export type QualityCategory = { id: string; name: string; blocking: boolean; passed: number[] };

/** Conversations passing each check, per week, out of SAMPLE_SIZE. */
export const QUALITY_CATEGORIES: QualityCategory[] = [
  { id: "policy", name: "Correct policy", blocking: false, passed: [193, 194, 191, 194, 193, 195, 193, 196] },
  { id: "ranking", name: "Best hotel ranked first", blocking: false, passed: [192, 193, 191, 193, 192, 194, 192, 195] },
  { id: "wording", name: "Wording", blocking: false, passed: [197, 197, 196, 198, 197, 197, 197, 193] },
  { id: "currency", name: "Currency", blocking: false, passed: [195, 195, 194, 196, 195, 196, 195, 198] },
  { id: "leak", name: "Data leak", blocking: true, passed: [200, 200, 200, 200, 200, 200, 200, 200] },
  { id: "injection", name: "Prompt injection", blocking: true, passed: [200, 200, 200, 200, 200, 200, 200, 200] },
];

"use client";

import { LAST_MONTH } from "@/features/metrics/data";
import { clampMonth, phaseFor } from "@/features/metrics/logic";

/** Writes the month into the address bar. Next keeps useSearchParams in step with replaceState. */
function writeMonth(month: number) {
  const params = new URLSearchParams(window.location.search);
  params.set("m", String(clampMonth(month)));
  window.history.replaceState(null, "", `?${params.toString()}`);
}

const MONTH_OPTIONS = Array.from({ length: LAST_MONTH + 1 }, (_, m) => ({ month: m, phase: phaseFor(m).name }));

const step =
  "grid h-8 w-8 shrink-0 place-items-center text-dim hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand";

/** Jira-style month select with previous and next buttons; the choice lives in `?m=`. */
export function MonthPicker({ month }: { month: number }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="dashboard-month" className="text-sm font-medium text-dim">
        Month
      </label>
      <div className="flex h-8 items-stretch overflow-hidden rounded-[3px] border border-edge-2 bg-panel">
        <button
          type="button"
          className={`${step} border-r border-edge`}
          aria-label="Previous month"
          disabled={month <= 0}
          onClick={() => writeMonth(month - 1)}
        >
          <span aria-hidden>‹</span>
        </button>
        <select
          id="dashboard-month"
          value={month}
          onChange={(e) => writeMonth(Number(e.target.value))}
          className="h-full cursor-pointer bg-panel px-2 text-sm text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          {MONTH_OPTIONS.map((o) => (
            <option key={o.month} value={o.month}>
              {`Month ${o.month} · ${o.phase}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`${step} border-l border-edge`}
          aria-label="Next month"
          disabled={month >= LAST_MONTH}
          onClick={() => writeMonth(month + 1)}
        >
          <span aria-hidden>›</span>
        </button>
      </div>
    </div>
  );
}

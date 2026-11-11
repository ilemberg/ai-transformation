"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { LAST_MONTH, NOT_MEASURED, PAIRS } from "../data";
import { clampMonth, metricById, pairVerdict, parseMonth } from "../logic";
import { CostSection } from "./CostSection";
import { PairCards } from "./PairCards";
import { RulesPanel } from "./RulesPanel";
import { Scorecard } from "./Scorecard";
import { Scrubber } from "./Scrubber";
import { StoryPanel } from "./StoryPanel";

/** With no `?m=`, show the end of the year: every rule has had its chance to fire. */
export const DEFAULT_MONTH = LAST_MONTH;

const STEP_MS = 1100;
const STEP_MS_REDUCED = 2400;

function monthFromLocation(): number {
  return parseMonth(new URLSearchParams(window.location.search).get("m"), DEFAULT_MONTH);
}

/** Writes the month into the address bar. Next keeps useSearchParams in step with replaceState. */
function writeMonth(month: number) {
  const params = new URLSearchParams(window.location.search);
  params.set("m", String(clampMonth(month)));
  window.history.replaceState(null, "", `?${params.toString()}`);
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/** The month comes from `?m=`; this must sit inside a Suspense boundary. */
export function MetricsDashboard() {
  const params = useSearchParams();
  return <MetricsView month={parseMonth(params.get("m"), DEFAULT_MONTH)} />;
}

/** Same view, for the Suspense fallback before the query string is read. */
export function MetricsView({ month }: { month: number }) {
  const [playing, setPlaying] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () => {
        const next = monthFromLocation() + 1;
        writeMonth(next);
        if (next >= LAST_MONTH) setPlaying(false);
      },
      reduced ? STEP_MS_REDUCED : STEP_MS,
    );
    return () => window.clearInterval(id);
  }, [playing, reduced]);

  const changeMonth = useCallback((m: number) => {
    setPlaying(false);
    writeMonth(m);
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (monthFromLocation() >= LAST_MONTH) writeMonth(0);
    setPlaying(true);
  }, [playing]);

  const verdicts = PAIRS.map((p) => pairVerdict(metricById(p.speed), metricById(p.quality), month).verdict);

  return (
    <div className="space-y-12 sm:space-y-16">
      <div className="space-y-4">
        <Scrubber
          month={month}
          playing={playing}
          verdicts={verdicts}
          onMonthChange={changeMonth}
          onTogglePlay={togglePlay}
        />
        <StoryPanel month={month} />
      </div>
      <PairCards month={month} />
      <RulesPanel month={month} />
      <CostSection month={month} />
      <Scorecard month={month} />
      <NotMeasured />
    </div>
  );
}

function NotMeasured() {
  return (
    <section aria-labelledby="not-measured-heading" className="rounded-xl border border-dashed border-edge-2 p-4 sm:p-6">
      <h2 id="not-measured-heading" className="font-semibold">
        Deliberately not measured
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {NOT_MEASURED.map((item) => (
          <li key={item.name} className="text-sm">
            <span className="font-medium text-ink">
              <span aria-hidden className="mr-1.5 text-fail">
                ✕
              </span>
              {item.name}
            </span>
            <p className="mt-1 text-dim">{item.why}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

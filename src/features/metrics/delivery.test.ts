import { describe, expect, it } from "vitest";
import { MONTHS, METRICS } from "./data";
import {
  AI_BUDGET,
  CAUGHT,
  COHORT_CYCLE,
  containment,
  cycleStages,
  ESCAPED_BY_SEVERITY,
  REQUEST_TO_LIVE_DAYS,
  SHIPPED,
  shippedTotal,
  spendShareByTeam,
  STAGES,
  TEAMS,
} from "./delivery";

const cycle = METRICS.find((m) => m.id === "cycleTime")!.series;
const months = Array.from({ length: MONTHS }, (_, i) => i);

describe("delivery detail", () => {
  it("has thirteen readings for every series", () => {
    const all = [
      COHORT_CYCLE.pilot,
      COHORT_CYCLE.others,
      REQUEST_TO_LIVE_DAYS,
      AI_BUDGET,
      ...Object.values(SHIPPED),
      ...Object.values(ESCAPED_BY_SEVERITY),
      ...Object.values(CAUGHT),
    ];
    for (const s of all) expect(s).toHaveLength(MONTHS);
  });

  it("splits cycle time into stages that add up to it", () => {
    for (const m of months) {
      const st = cycleStages(m);
      const sum = STAGES.reduce((n, k) => n + st[k], 0);
      expect(sum).toBeCloseTo(cycle[m], 6);
      expect(st.release).toBeGreaterThan(2);
    }
  });

  it("shows review waiting as the bottleneck in months 4-5, and shrinking after", () => {
    expect(cycleStages(5).review).toBeGreaterThan(cycleStages(1).review);
    expect(cycleStages(12).review).toBeLessThan(cycleStages(1).review);
  });

  it("has the pilot teams ahead of the others, with both improving", () => {
    expect(COHORT_CYCLE.pilot[3]).toBeLessThan(COHORT_CYCLE.others[3]);
    expect(COHORT_CYCLE.others[12]).toBeLessThan(COHORT_CYCLE.others[0]);
  });

  it("ships more each month by the end of the year, modestly", () => {
    const growth = shippedTotal(12) / shippedTotal(0);
    expect(growth).toBeGreaterThan(1.15);
    expect(growth).toBeLessThan(1.45);
  });

  it("splits team spend into shares that sum to one, with nothing big before a team joins", () => {
    for (const m of months) {
      const shares = spendShareByTeam(m);
      expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    }
    const before = spendShareByTeam(5);
    const payments = TEAMS.find((t) => t.id === "payments")!;
    expect(payments.joined).toBeGreaterThan(5);
    expect(before.payments).toBeLessThan(before.search);
  });

  it("stops most problems before customers see them, more so over time", () => {
    expect(containment(12)).toBeGreaterThan(containment(0));
    expect(containment(12)).toBeLessThan(1);
  });
});

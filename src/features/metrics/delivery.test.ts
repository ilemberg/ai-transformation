import { describe, expect, it } from "vitest";
import { MONTHS, METRICS } from "./data";
import {
  AI_BUDGET,
  CAUGHT,
  COHORT_CYCLE,
  containment,
  CHECKOUT_CONVERSION,
  codingCycleTime,
  comprehensionAt,
  DUPLICATE_CHARGE_INCIDENTS,
  REBOOK_SUCCESS,
  SUCCESSFUL_BOOKINGS,
  cycleStages,
  leadTime,
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

  it("keeps coding cycle time (first commit on) apart from lead time (spec included)", () => {
    for (const m of months) {
      const st = cycleStages(m);
      const coding = STAGES.filter((k) => k !== "plan").reduce((n, k) => n + st[k], 0);
      expect(coding).toBeCloseTo(cycle[m], 6);
      expect(codingCycleTime(m)).toBe(cycle[m]);
      expect(leadTime(m)).toBeCloseTo(coding + st.plan, 6);
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

  it("has customer outcomes that move after the features that should move them", () => {
    for (const s of [REBOOK_SUCCESS, CHECKOUT_CONVERSION, DUPLICATE_CHARGE_INCIDENTS, SUCCESSFUL_BOOKINGS]) {
      expect(s).toHaveLength(MONTHS);
    }
    expect(REBOOK_SUCCESS[9] - REBOOK_SUCCESS[8]).toBeGreaterThan(4);
    expect(CHECKOUT_CONVERSION[10]).toBeGreaterThan(CHECKOUT_CONVERSION[9]);
    expect(DUPLICATE_CHARGE_INCIDENTS[12]).toBe(1);
  });

  it("reports the latest code-comprehension check, and none before the first", () => {
    expect(comprehensionAt(2)).toBeNull();
    expect(comprehensionAt(7)?.month).toBe(6);
    expect(comprehensionAt(12)).toMatchObject({ passed: 9, sessions: 10 });
  });
});

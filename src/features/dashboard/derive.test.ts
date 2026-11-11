import { describe, expect, it } from "vitest";
import { MONTHS } from "@/features/metrics/data";
import { AI_BUDGET, PAYROLL_PER_MONTH, shippedTotal } from "@/features/metrics/delivery";
import {
  BUDGET_MINUTES,
  budgetCheck,
  budgetToDate,
  costPerShipped,
  errorBudget,
  forecastQuarter,
  formatDollars,
  fromPeak,
  incidentSeries,
  incidentsAt,
  monthlySpend,
  payrollShare,
  shippedPerEngineer,
  shippedSeries,
  slopeOf,
  spendByTeam,
  spendByTier,
  spendPerEngineer,
  spendSeries,
} from "./derive";

describe("monthlySpend", () => {
  it("is spend per change × throughput × 6 teams × 4.33 weeks", () => {
    // Month 12: $22 per change, 18.7 changes per team per week.
    expect(monthlySpend(12)).toBeCloseTo(22 * 18.7 * 6 * 4.33, 6);
  });

  it("stays in a believable range once agents are in use: $10k–16k a month, $250–400 per engineer", () => {
    for (let m = 4; m <= 12; m++) {
      expect(monthlySpend(m), `month ${m}`).toBeGreaterThan(10_000);
      expect(monthlySpend(m), `month ${m}`).toBeLessThan(16_000);
      expect(spendPerEngineer(m), `month ${m}`).toBeGreaterThan(250);
      expect(spendPerEngineer(m), `month ${m}`).toBeLessThan(400);
    }
  });

  it("is under $1k a month at baseline, when only autocomplete runs", () => {
    expect(monthlySpend(0)).toBeLessThan(1000);
  });
});

describe("spendByTier", () => {
  it("splits the month's spend by price-weighted token share and adds back up", () => {
    const s = spendByTier(12);
    expect(s.small + s.medium + s.large).toBeCloseTo(s.total, 6);
    // Month 12 tokens are 35 / 45 / 20; weighted 1 : 3 : 12 that is 35 / 135 / 240 of 410.
    expect(s.small).toBeCloseTo((s.total * 35) / 410, 6);
    expect(s.large).toBeCloseTo((s.total * 240) / 410, 6);
  });

  it("puts most dollars on large models even when most tokens are not", () => {
    const s = spendByTier(12);
    expect(s.large).toBeGreaterThan(s.small + s.medium);
  });
});

describe("errorBudget", () => {
  it("is 43.2 minutes for 99.9% over 30 days", () => {
    expect(BUDGET_MINUTES).toBeCloseTo(43.2, 6);
  });

  it("derives minutes used from uptime", () => {
    const b = errorBudget(99.97);
    expect(b.used).toBeCloseTo(12.96, 6);
    expect(b.left).toBeCloseTo(30.24, 6);
    expect(b.leftShare).toBeCloseTo(0.7, 6);
  });

  it("never goes below zero left", () => {
    const b = errorBudget(99.5);
    expect(b.left).toBe(0);
    expect(b.used).toBeCloseTo(BUDGET_MINUTES, 6);
  });

  it("has the whole budget left at 100%", () => {
    expect(errorBudget(100).leftShare).toBe(1);
  });
});

describe("formatDollars", () => {
  it("formats whole dollars, or thousands when compact", () => {
    expect(formatDollars(2899.4)).toBe("$2,899");
    expect(formatDollars(2899.4, true)).toBe("$2.9k");
    expect(formatDollars(640, true)).toBe("$640");
  });
});

describe("executive numbers", () => {
  it("cost per shipped ticket is the month's spend over tickets that reached customers", () => {
    for (let m = 0; m < MONTHS; m++) {
      expect(costPerShipped(m), `month ${m}`).toBeCloseTo(monthlySpend(m) / shippedTotal(m), 6);
    }
    // Month 6: 118 tickets; month 12: 134.
    expect(shippedTotal(6)).toBe(118);
    expect(shippedTotal(12)).toBe(134);
    expect(costPerShipped(6)).toBeCloseTo((33 * 15.9 * 6 * 4.33) / 118, 6);
    expect(costPerShipped(12)).toBeCloseTo((22 * 18.7 * 6 * 4.33) / 134, 6);
  });

  it("shipped per engineer is shipped tickets over 40 engineers", () => {
    expect(shippedPerEngineer(0)).toBeCloseTo(106 / 40, 6);
    expect(shippedPerEngineer(12)).toBeCloseTo(134 / 40, 6);
    expect(shippedSeries()).toHaveLength(MONTHS);
  });

  it("puts AI spend at about 1–2.5% of payroll once the rollout is under way", () => {
    for (let m = 4; m < MONTHS; m++) {
      expect(payrollShare(m), `month ${m}`).toBeGreaterThan(1);
      expect(payrollShare(m), `month ${m}`).toBeLessThan(2.5);
    }
    expect(payrollShare(6)).toBeCloseTo((monthlySpend(6) / PAYROLL_PER_MONTH) * 100, 6);
  });

  it("checks spend against the agreed budget", () => {
    const b = budgetCheck(6);
    expect(b.budget).toBe(AI_BUDGET[6]);
    expect(b.diff).toBeCloseTo(b.spend - b.budget, 6);
    expect(b.over).toBe(false);
    for (let m = 0; m < MONTHS; m++) expect(budgetCheck(m).spend, `month ${m}`).toBeCloseTo(spendSeries()[m] ?? 0, 6);
  });

  it("adds spend and budget up to the selected month", () => {
    const ytd = budgetToDate(2);
    expect(ytd.budget).toBe(1_000 + 1_000 + 12_000);
    expect(ytd.spend).toBeCloseTo(monthlySpend(0) + monthlySpend(1) + monthlySpend(2), 6);
  });

  it("splits spend across all six teams and adds back up", () => {
    for (const m of [0, 3, 6, 12]) {
      const rows = spendByTeam(m);
      expect(rows).toHaveLength(6);
      expect(rows.reduce((n, r) => n + r.spend, 0), `month ${m}`).toBeCloseTo(monthlySpend(m), 6);
      for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.spend).toBeGreaterThanOrEqual(rows[i]!.spend);
    }
    // Month 2: only the pilot teams are in, so they spend the most.
    expect(spendByTeam(2).slice(0, 2).map((r) => r.id).sort()).toEqual(["rebooking", "search"]);
  });

  it("counts customer-facing bugs by severity", () => {
    const i = incidentsAt(5);
    expect(i).toMatchObject({ sev1: 2, sev2: 7, sev3: 13, total: 22 });
    expect(incidentSeries()[5]).toBe(22);
  });
});

describe("slopeOf", () => {
  it("is the least-squares slope", () => {
    expect(slopeOf([1, 2, 3])).toBeCloseTo(1, 9);
    expect(slopeOf([10, 10, 10])).toBe(0);
    expect(slopeOf([3, 1, 2])).toBeCloseTo(-0.5, 9);
    expect(slopeOf([4, 6])).toBeCloseTo(2, 9);
  });

  it("is zero with fewer than two points", () => {
    expect(slopeOf([])).toBe(0);
    expect(slopeOf([5])).toBe(0);
  });
});

describe("forecastQuarter", () => {
  it("carries the last three months' line three months on", () => {
    const f = forecastQuarter(3, [0, 0, 100, 110, 120, 130]);
    expect(f.months).toEqual([4, 5, 6]);
    // Last three: 0, 100, 110 → slope 55.
    expect(f.slope).toBeCloseTo(55, 9);
    expect(f.trend).toEqual([165, 220, 275]);
    expect(f.central).toBe(660);
    expect(f.flat).toBe(330);
    expect(f.low).toBeCloseTo(330 * 0.9, 9);
    expect(f.high).toBeCloseTo(660 * 1.1, 9);
  });

  it("never projects below zero", () => {
    const f = forecastQuarter(2, [300, 200, 100]);
    expect(f.trend).toEqual([0, 0, 0]);
    expect(f.low).toBe(0);
    expect(f.high).toBeCloseTo(330, 9);
  });

  it("uses what there is at the start of the year", () => {
    const f = forecastQuarter(0, [500, 600]);
    expect(f.slope).toBe(0);
    expect(f.central).toBe(1500);
    expect(f.low).toBeCloseTo(1350, 9);
    expect(f.high).toBeCloseTo(1650, 9);
  });

  it("holds the range around the trend and flat spend for every month", () => {
    for (let m = 0; m < MONTHS; m++) {
      const f = forecastQuarter(m);
      expect(f.low, `month ${m}`).toBeLessThanOrEqual(Math.min(f.central, f.flat));
      expect(f.high, `month ${m}`).toBeGreaterThanOrEqual(Math.max(f.central, f.flat));
      expect(f.low).toBeGreaterThanOrEqual(0);
    }
  });

  it("brings in the agreed budget only while all three months are in the year", () => {
    expect(forecastQuarter(6).budget).toBe(15_000 + 14_000 + 14_000);
    expect(forecastQuarter(9).budget).toBe(13_000 + 13_000 + 12_000);
    expect(forecastQuarter(10).budget).toBeNull();
    expect(forecastQuarter(12).budget).toBeNull();
  });

  it("sees spend easing from month 6 on", () => {
    expect(forecastQuarter(6).slope).toBeLessThan(0);
    expect(forecastQuarter(12).slope).toBeLessThan(0);
  });
});

describe("fromPeak", () => {
  it("has nothing to compare with in months 0 and 1", () => {
    expect(fromPeak([1, 2, 3], 0)).toBeNull();
    expect(fromPeak([1, 2, 3], 1)).toBeNull();
  });

  it("compares the month with the highest month so far, in percent", () => {
    const p = fromPeak([1, 1, 10, 20, 15, 10], 5);
    expect(p).toMatchObject({ peak: 20, peakMonth: 3, atPeak: false });
    expect(p?.relative).toBeCloseTo(-50, 9);
  });

  it("ignores months after the selected one and flags a month that is the peak", () => {
    expect(fromPeak([1, 1, 10, 20, 15], 2)).toMatchObject({ peak: 10, peakMonth: 2, relative: 0, atPeak: true });
  });

  it("puts the cost-per-ticket and payroll-share peaks in month 4", () => {
    const cost = Array.from({ length: MONTHS }, (_, m) => costPerShipped(m));
    const share = Array.from({ length: MONTHS }, (_, m) => payrollShare(m));
    expect(fromPeak(cost, 12)?.peakMonth).toBe(4);
    expect(fromPeak(share, 12)?.peakMonth).toBe(4);
    expect(fromPeak(cost, 12)?.relative).toBeCloseTo((costPerShipped(12) / costPerShipped(4) - 1) * 100, 9);
  });
});

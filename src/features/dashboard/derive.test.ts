import { describe, expect, it } from "vitest";
import {
  BUDGET_MINUTES,
  errorBudget,
  formatDollars,
  monthlySpend,
  spendByTier,
  spendPerEngineer,
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

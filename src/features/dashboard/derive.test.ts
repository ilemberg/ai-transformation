import { describe, expect, it } from "vitest";
import { BUDGET_MINUTES, errorBudget, formatDollars, monthlySpend, spendByTier } from "./derive";

describe("monthlySpend", () => {
  it("is spend per change × throughput × 6 teams × 4.33 weeks", () => {
    // Month 12: $3.10 per change, 36 changes per team per week.
    expect(monthlySpend(12)).toBeCloseTo(3.1 * 36 * 6 * 4.33, 6);
  });
});

describe("spendByTier", () => {
  it("splits the month's spend by token share and adds back up", () => {
    const s = spendByTier(12);
    expect(s.small + s.medium + s.large).toBeCloseTo(s.total, 6);
    expect(s.small).toBeCloseTo(s.total * 0.5, 6);
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

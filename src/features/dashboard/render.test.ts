import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MONTHS } from "@/features/metrics/data";
import { DEFAULT_MONTH, DashboardView } from "./components/Dashboard";
import { GADGET_BODIES } from "./components/GadgetBodies";
import { GADGET_IDS } from "./gadgets";

const html = (id: (typeof GADGET_IDS)[number], month: number) =>
  renderToStaticMarkup(createElement(GADGET_BODIES[id], { month }));

describe("gadget bodies", () => {
  it("render for every month without throwing", () => {
    for (const id of GADGET_IDS) {
      for (let m = 0; m < MONTHS; m++) expect(() => html(id, m), `${id} at month ${m}`).not.toThrow();
    }
  });

  it("follow the month they are given", () => {
    expect(html("tokenSpend", 4)).toContain("Month 4 AI spend");
    expect(html("tokenSpend", 12)).toContain("Month 12 AI spend");
    expect(html("cycleTime", 0)).toContain(">52<");
    expect(html("cycleTime", 12)).toContain(">37<");
    expect(html("evals", 8)).toContain("Release blocked");
    expect(html("errorBudget", 5)).toContain("Spent");
  });

  it("never call the numbers sample data", () => {
    for (const id of GADGET_IDS) expect(html(id, 6).toLowerCase()).not.toContain("sample");
  });
});

describe("dashboard view", () => {
  const page = renderToStaticMarkup(createElement(DashboardView, { month: DEFAULT_MONTH }));

  it("opens on month 6 with the title, subtitle and month picker", () => {
    expect(DEFAULT_MONTH).toBe(6);
    expect(page).toContain("Executive dashboard");
    expect(page).toContain("For stakeholders: spend, speed and stability at a glance.");
    // Every gadget footer names the month shown, not the last month.
    expect(page).toContain("Month 6 · Expand · ");
    expect(page).not.toContain("Month 12 · Steady state · ");
    expect(page.toLowerCase()).not.toContain("sample");
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MONTHS } from "@/features/metrics/data";
import { DEFAULT_MONTH, DashboardView } from "./components/Dashboard";
import { GADGET_BODIES } from "./components/GadgetBodies";
import { DEFAULT_IDS, GADGET_IDS, GADGETS } from "./gadgets";

const html = (id: (typeof GADGET_IDS)[number], month: number) =>
  renderToStaticMarkup(createElement(GADGET_BODIES[id], { month }));

/** The visible text, without tags or React's text separators. */
const text = (id: (typeof GADGET_IDS)[number], month: number) =>
  html(id, month)
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

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

  it("change with the month on every executive gadget", () => {
    for (const id of DEFAULT_IDS) {
      expect(text(id, 6), id).not.toBe(text(id, 12));
    }
  });

  it("show the month's shipped tickets, cost per ticket, budget and payroll share", () => {
    expect(text("shipped", 6)).toContain("118 tickets");
    expect(text("shipped", 12)).toContain("134 tickets");
    expect(text("costPerTicket", 6)).toContain("$116 / ticket");
    expect(text("costPerTicket", 12)).toContain("$80 / ticket");
    expect(text("aiBudget", 6)).toContain("$13,632 of $15,000 budget");
    expect(text("aiBudget", 6)).toContain("Under by $1,368");
    expect(text("aiBudget", 12)).toContain("$10,688 of $12,000 budget");
    expect(text("payrollShare", 6)).toContain("2.13%");
    expect(text("payrollShare", 12)).toContain("1.67%");
    expect(text("requestToLive", 12)).toContain("13.0 days");
    expect(text("shippedPerEngineer", 12)).toContain("3.35");
  });

  it("compare spend with the peak so far, not the autocomplete-only baseline", () => {
    expect(text("costPerTicket", 6)).toContain("−9% from the month-4 peak");
    expect(text("costPerTicket", 12)).toContain("−37% from the month-4 peak");
    expect(text("payrollShare", 6)).toContain("−7% from the month-4 peak");
    expect(text("payrollShare", 12)).toContain("−27% from the month-4 peak");
    expect(html("payrollShare", 12)).toContain("text-pass");
    expect(text("costPerTicket", 4)).toContain("highest month so far");
    expect(text("costPerChange", 12)).toContain("from the month-4 peak");
    for (const id of ["costPerTicket", "payrollShare"] as const) {
      for (const m of [0, 1]) {
        expect(text(id, m), `${id} at month ${m}`).not.toMatch(/peak|vs baseline|highest/);
      }
    }
    for (const id of ["costPerTicket", "payrollShare", "costPerChange"] as const) {
      expect(text(id, 0), id).not.toMatch(/peak|highest/);
      expect(text(id, 12), id).not.toContain("worse");
    }
  });

  it("forecast the three months after the one picked, with the budget while there is one", () => {
    expect(text("forecast", 6)).toContain("months 7–9");
    expect(text("forecast", 6)).toContain("Budget $43.0k");
    expect(text("forecast", 12)).toContain("No budget agreed yet for months 13–15");
  });

  it("flag the month uptime fell below the SLO", () => {
    expect(text("risk", 5)).toContain("Below SLO");
    expect(text("risk", 6)).toContain("Within SLO");
    expect(text("risk", 5)).toContain("22");
  });

  it("never call the numbers sample data, illustrative or guaranteed", () => {
    for (const id of GADGET_IDS) {
      for (const m of [0, 6, 12]) {
        const t = text(id, m).toLowerCase();
        expect(t, `${id} at month ${m}`).not.toContain("sample");
        expect(t, `${id} at month ${m}`).not.toContain("illustrative");
        expect(t, `${id} at month ${m}`).not.toContain("guarantee");
      }
    }
    for (const g of Object.values(GADGETS)) {
      const t = `${g.title} ${g.description} ${g.footnote ?? ""}`.toLowerCase();
      expect(t, g.id).not.toMatch(/sample|illustrative|guarantee/);
    }
  });
});

describe("dashboard view", () => {
  const page = renderToStaticMarkup(createElement(DashboardView, { month: DEFAULT_MONTH }));

  it("opens on month 6 with the title, subtitle and month picker", () => {
    expect(DEFAULT_MONTH).toBe(6);
    expect(page).toContain("Executive dashboard");
    expect(page).toContain("For executives and finance: what we are getting done, what we are spending, and the risk.");
    // Every gadget footer names the month shown, not the last month.
    expect(page).toContain("Month 6 · Expand · ");
    expect(page).not.toContain("Month 12 · Steady state · ");
    expect(page.toLowerCase()).not.toContain("sample");
  });

  it("shows the default gadgets in order", () => {
    const order = [...page.matchAll(/data-gadget="([^"]+)"/g)].map((m) => m[1]);
    expect(order).toEqual([...DEFAULT_IDS]);
  });
});

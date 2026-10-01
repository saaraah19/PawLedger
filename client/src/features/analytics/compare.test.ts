import { describe, expect, it } from "vitest";
import type { Delta } from "./api";
import { describeChange, formatPct, periodLabel } from "./compare";

const d = (a: number, b: number): Delta => ({ a: { total: a, count: 1 }, b: { total: b, count: 1 }, change: b - a, changePct: a > 0 ? (b - a) / a : null });

describe("describeChange", () => {
  it("states increases and decreases with the amount and percentage", () => {
    expect(describeChange("Hiking spending", d(250000, 1560000), "DZD")).toBe("Hiking spending increased by 13,100 DZD (524%).");
    expect(describeChange("Education spending", d(800000, 450000), "DZD")).toBe("Education spending decreased by 3,500 DZD (44%).");
  });
  it("handles a category that exists in only one period", () => {
    expect(describeChange("Photography spending", d(0, 500000), "DZD")).toBe("Photography spending: 5,000 DZD in the second period, nothing in the first.");
    expect(describeChange("Old hobby spending", d(90000, 0), "DZD")).toBe("Old hobby spending: nothing in the second period, 900 DZD in the first.");
  });
  it("handles no movement and empty periods", () => {
    expect(describeChange("Income", d(4200000, 4200000), "DZD")).toBe("Income stayed the same at 42,000 DZD.");
    expect(describeChange("Food spending", d(0, 0), "DZD")).toMatch(/nothing recorded in either/);
  });
  it("never passes judgement", () => {
    const all = [d(1, 999999), d(999999, 1), d(0, 5), d(5, 0)].map((x) => describeChange("Spending", x, "DZD")).join(" ");
    expect(all).not.toMatch(/too much|overspen|irresponsible|should|stop|good|bad|great/i);
  });
});

describe("formatPct", () => {
  it("signs the change, says 'new' when there was nothing before, and stays silent for no change", () => {
    expect(formatPct(d(1000, 1300))).toBe("+30%");
    expect(formatPct(d(1000, 560))).toBe("\u221244%");
    expect(formatPct(d(1000, 0))).toBe("\u2212100%");
    expect(formatPct(d(0, 500))).toBe("new");
    expect(formatPct(d(700, 700))).toBe("");
  });
});

describe("periodLabel", () => {
  it("labels months and custom ranges", () => {
    expect(periodLabel({ from: "2026-07-01", to: "2026-07-31", month: "2026-07" })).toBe("July 2026");
    expect(periodLabel({ from: "2026-07-01", to: "2026-07-15" })).toBe("1 Jul 2026 to 15 Jul 2026");
  });
});

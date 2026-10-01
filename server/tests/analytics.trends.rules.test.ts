import { describe, expect, it } from "vitest";
import { monthsQuery, trendQuery } from "../src/schemas/analytics.schema";
import { fillMonths, monthBounds, monthsBetween, resolveMonthRange, shiftMonth } from "../src/services/analytics.range";

describe("month helpers", () => {
  it("shifts and lists months across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthsBetween("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthsBetween("2026-09", "2026-09")).toEqual(["2026-09"]);
  });
  it("defaults to the last 12 months in the user's timezone", () => {
    const now = new Date("2026-09-30T23:30:00Z"); // already October in Algiers
    expect(resolveMonthRange({}, "Africa/Algiers", now)).toEqual({ from: "2025-11", to: "2026-10", currentMonth: "2026-10" });
    const r = resolveMonthRange({}, "UTC", now);
    expect(monthsBetween(r.from, r.to)).toHaveLength(12);
    expect(resolveMonthRange({ from: "2024-01", to: "2024-03" }, "UTC", now).from).toBe("2024-01");
  });
  it("bounds cover whole months", () => {
    const { start, end } = monthBounds("2026-02", "2026-03");
    expect(start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-31T23:59:59.999Z");
  });
  it("zero-fills months with no activity, in order", () => {
    const filled = fillMonths(["2026-07", "2026-08", "2026-09"], new Map([["2026-08", { total: 500, count: 2 }]]), { total: 0, count: 0 });
    expect(filled).toEqual([
      { month: "2026-07", total: 0, count: 0 },
      { month: "2026-08", total: 500, count: 2 },
      { month: "2026-09", total: 0, count: 0 },
    ]);
  });
});

describe("monthsQuery / trendQuery", () => {
  it("accepts nothing or a valid range", () => {
    expect(monthsQuery.safeParse({}).success).toBe(true);
    expect(monthsQuery.safeParse({ from: "2026-01", to: "2026-09" }).success).toBe(true);
  });
  it("rejects half, reversed, malformed and oversized ranges", () => {
    for (const q of [{ from: "2026-01" }, { from: "2026-09", to: "2026-01" }, { from: "2026-13", to: "2026-14" }, { from: "2010-01", to: "2026-09" }]) {
      expect(monthsQuery.safeParse(q).success).toBe(false);
    }
    expect(monthsQuery.safeParse({ from: "2017-01", to: "2026-12" }).success).toBe(true); // exactly 10 years
  });
  it("requires a valid category id for trends", () => {
    expect(trendQuery.safeParse({}).success).toBe(false);
    expect(trendQuery.safeParse({ categoryId: "64b7f0c2a1b2c3d4e5f60718" }).success).toBe(true);
  });
});

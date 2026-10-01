import { describe, expect, it } from "vitest";
import { settingsBody } from "../src/schemas/settings.schema";
import { summaryQuery } from "../src/schemas/analytics.schema";
import { rangeBounds, resolveRange, todayIn } from "../src/services/analytics.range";
import { rollupByCategory } from "../src/services/analytics.rollup";

describe("resolveRange", () => {
  const now = new Date("2026-09-30T23:30:00Z");
  it("uses the user's timezone to decide which month it is", () => {
    // 23:30 UTC on 30 Sep is already 1 Oct in Algiers (UTC+1)
    expect(todayIn("Africa/Algiers", now)).toBe("2026-10-01");
    expect(todayIn("UTC", now)).toBe("2026-09-30");
    expect(resolveRange({}, "Africa/Algiers", now).month).toBe("2026-10");
    expect(resolveRange({}, "UTC", now).month).toBe("2026-09");
  });
  it("covers whole months, including February in leap and normal years", () => {
    expect(resolveRange({ month: "2026-09" }, "UTC", now)).toMatchObject({ from: "2026-09-01", to: "2026-09-30" });
    expect(resolveRange({ month: "2028-02" }, "UTC", now).to).toBe("2028-02-29");
    expect(resolveRange({ month: "2027-02" }, "UTC", now).to).toBe("2027-02-28");
  });
  it("passes a custom range through", () => {
    const r = resolveRange({ from: "2026-07-05", to: "2026-09-10" }, "UTC", now);
    expect(r).toMatchObject({ from: "2026-07-05", to: "2026-09-10" });
    expect(r.month).toBeUndefined(); // a custom range is not a month
  });
  it("bounds catch a noon-UTC transaction on the first and last day only", () => {
    const { start, end } = rangeBounds("2026-09-01", "2026-09-30");
    const inRange = (iso: string) => new Date(iso) >= start && new Date(iso) <= end;
    expect(inRange("2026-09-01T12:00:00Z")).toBe(true);
    expect(inRange("2026-09-30T12:00:00Z")).toBe(true);
    expect(inRange("2026-08-31T12:00:00Z")).toBe(false);
    expect(inRange("2026-10-01T12:00:00Z")).toBe(false);
  });
});

describe("summaryQuery", () => {
  it("accepts a month, a range, or nothing", () => {
    expect(summaryQuery.safeParse({}).success).toBe(true);
    expect(summaryQuery.safeParse({ month: "2026-09" }).success).toBe(true);
    expect(summaryQuery.safeParse({ from: "2026-09-01", to: "2026-09-30" }).success).toBe(true);
  });
  it("rejects mixed, half, reversed and impossible ranges", () => {
    for (const q of [
      { month: "2026-09", from: "2026-09-01", to: "2026-09-30" },
      { from: "2026-09-01" },
      { from: "2026-09-30", to: "2026-09-01" },
      { month: "2026-13" },
      { from: "2026-02-30", to: "2026-03-01" },
    ]) expect(summaryQuery.safeParse(q).success).toBe(false);
  });
});

describe("rollupByCategory", () => {
  const cats = [
    { id: "hiking", name: "Hiking" },
    { id: "gear", name: "Gear", parentId: "hiking" },
    { id: "food", name: "Food", parentId: "hiking" },
    { id: "edu", name: "Education" },
  ];
  const rows = [
    { _id: "hiking", total: 1000, count: 1 },
    { _id: "gear", total: 8500, count: 2 },
    { _id: "food", total: 500, count: 1 },
    { _id: "edu", total: 4500, count: 1 },
    { _id: null, total: 700, count: 3 },
    { _id: "deleted-id", total: 300, count: 1 },
  ];
  const out = rollupByCategory(rows, cats);

  it("rolls sub-categories into their parent and orders by total", () => {
    expect(out.map((r) => [r.name, r.total, r.count])).toEqual([
      ["Hiking", 10000, 4],
      ["Education", 4500, 1],
      ["No category", 1000, 4],
    ]);
    expect(out[0].children.map((c) => [c.name, c.total])).toEqual([["Gear", 8500], ["Food", 500]]);
  });
  it("never loses or invents money", () => {
    expect(out.reduce((s, r) => s + r.total, 0)).toBe(rows.reduce((s, r) => s + r.total, 0));
    expect(out.reduce((s, r) => s + r.count, 0)).toBe(rows.reduce((s, r) => s + r.count, 0));
  });
  it("handles no expenses", () => {
    expect(rollupByCategory([], cats)).toEqual([]);
  });
});

describe("settingsBody", () => {
  it("accepts a supported currency and a real timezone", () => {
    expect(settingsBody.safeParse({ currency: "EUR", timezone: "Africa/Algiers" }).success).toBe(true);
    expect(settingsBody.safeParse({ currency: "DZD", timezone: "UTC" }).success).toBe(true);
  });
  it("rejects unknown currencies and timezones", () => {
    expect(settingsBody.safeParse({ currency: "XYZ", timezone: "UTC" }).success).toBe(false);
    expect(settingsBody.safeParse({ currency: "DZD", timezone: "Mars/Base" }).success).toBe(false);
  });
});

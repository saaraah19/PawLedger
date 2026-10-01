import { describe, expect, it } from "vitest";
import { buildDemoData, categoriesToKeep, DEMO_CATEGORIES } from "../src/services/demo.data";

const kindOf = new Map(DEMO_CATEGORIES.map((c) => [c.key, c.kind]));

describe.each(["2026-09-29", "2026-09-02", "2026-03-01", "2028-02-29", "2026-12-31"])("buildDemoData(%s)", (today) => {
  const { categories, transactions } = buildDemoData(today);

  it("never dates anything after today, and stays within five months", () => {
    expect(transactions.every((t) => t.date <= today)).toBe(true);
    expect(transactions.every((t) => t.date >= `${today.slice(0, 4)}-01-01` || t.date >= "2025-01-01")).toBe(true);
    expect(new Set(transactions.map((t) => t.date.slice(0, 7))).size).toBe(5);
  });
  it("only produces real calendar days", () => {
    for (const t of transactions) expect(new Date(`${t.date}T12:00:00Z`).toISOString().slice(0, 10)).toBe(t.date);
  });
  it("uses categories that exist, of the matching kind", () => {
    const keys = new Set(categories.map((c) => c.key));
    for (const t of transactions) {
      expect(keys.has(t.categoryKey)).toBe(true);
      expect(kindOf.get(t.categoryKey)).toBe(t.type);
    }
  });
  it("uses whole positive minor units, with items that add up to their total", () => {
    for (const t of transactions) {
      expect(Number.isInteger(t.amount) && t.amount > 0).toBe(true);
      if (t.items) expect(t.items.reduce((s, i) => s + i.amount, 0)).toBe(t.amount);
    }
  });
  it("keeps expense-only fields off income", () => {
    for (const t of transactions.filter((t) => t.type === "income")) {
      expect(t.items).toBeUndefined();
      expect(t.spendingType).toBeUndefined();
    }
  });
});

describe("buildDemoData content", () => {
  const { transactions } = buildDemoData("2026-09-29");
  it("is deterministic", () => {
    expect(buildDemoData("2026-09-29")).toEqual(buildDemoData("2026-09-29"));
  });
  it("tells the hiking story from the spec: spending on hiking grows month by month", () => {
    const hiking = (m: string) => transactions.filter((t) => t.date.startsWith(m) && ["hiking", "hiking-gear", "hiking-food", "hiking-trips"].includes(t.categoryKey)).reduce((s, t) => s + t.amount, 0);
    expect([hiking("2026-05"), hiking("2026-06"), hiking("2026-07"), hiking("2026-08"), hiking("2026-09")]).toEqual([0, 200000, 250000, 620000, 1560000]);
  });
  it("includes a multi-item purchase, an impulse purchase, income and a refund", () => {
    expect(transactions.some((t) => (t.items?.length ?? 0) === 3 && t.amount === 1560000)).toBe(true);
    expect(transactions.some((t) => t.spendingType === "impulse")).toBe(true);
    expect(transactions.some((t) => t.categoryKey === "refunds")).toBe(true);
    expect(transactions.filter((t) => t.type === "income").length).toBeGreaterThanOrEqual(5);
  });
  it("has enough expenses every month for the observations to have something to say", () => {
    for (const m of ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]) {
      expect(transactions.filter((t) => t.date.startsWith(m) && t.type === "expense").length).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("categoriesToKeep", () => {
  const demo = [{ id: "hiking" }, { id: "gear", parentId: "hiking" }, { id: "food", parentId: "hiking" }, { id: "bills" }];
  it("keeps nothing when the user built on nothing", () => {
    expect(categoriesToKeep(demo, new Set(), new Set()).size).toBe(0);
  });
  it("keeps a category a real transaction uses, together with its parent", () => {
    expect([...categoriesToKeep(demo, new Set(["gear"]), new Set())].sort()).toEqual(["gear", "hiking"]);
  });
  it("keeps a parent that has a real sub-category, and ignores ids that were never example data", () => {
    expect([...categoriesToKeep(demo, new Set(["mine"]), new Set(["bills"]))]).toEqual(["bills"]);
  });
});

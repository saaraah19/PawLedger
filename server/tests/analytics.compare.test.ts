import { describe, expect, it } from "vitest";
import { comparisonQuery } from "../src/schemas/analytics.schema";
import { buildComparison, delta, mergeCategories } from "../src/services/analytics.compare";

const row = (categoryId: string | null, name: string, total: number, count = 1, children: { categoryId: string; name: string; total: number; count: number }[] = []) => ({ categoryId, name, total, count, children });
const summary = (income: number, expenses: number, categories: ReturnType<typeof row>[], month = "2026-07") => ({
  period: { from: `${month}-01`, to: `${month}-28`, month },
  transactionCount: 3,
  income: { total: income, count: 1 },
  expenses: { total: expenses, count: 2 },
  categories,
});

describe("delta", () => {
  it("is b minus a, with a percentage relative to a", () => {
    expect(delta({ total: 2500, count: 1 }, { total: 15600, count: 4 })).toMatchObject({ change: 13100, changePct: 13100 / 2500 });
    expect(delta({ total: 8000, count: 2 }, { total: 4500, count: 1 })).toMatchObject({ change: -3500, changePct: -0.4375 });
  });
  it("has no percentage when there was nothing to compare against", () => {
    expect(delta({ total: 0, count: 0 }, { total: 500, count: 1 }).changePct).toBeNull();
    expect(delta({ total: 0, count: 0 }, { total: 0, count: 0 })).toMatchObject({ change: 0, changePct: null });
  });
});

describe("mergeCategories", () => {
  const a = [row("hiking", "Hiking", 2500), row("edu", "Education", 8000), row("old", "Old hobby", 900)];
  const b = [row("hiking", "Hiking", 15600, 4, [{ categoryId: "gear", name: "Gear", total: 15600, count: 4 }]), row("edu", "Education", 4500), row(null, "No category", 300)];
  const out = mergeCategories(a, b);

  it("keeps categories that appear in only one period", () => {
    expect(out.map((r) => r.name).sort()).toEqual(["Education", "Hiking", "No category", "Old hobby"]);
    expect(out.find((r) => r.name === "Old hobby")).toMatchObject({ b: { total: 0, count: 0 }, change: -900 });
    expect(out.find((r) => r.name === "No category")).toMatchObject({ a: { total: 0, count: 0 }, change: 300, changePct: null });
  });
  it("sorts by the size of the movement, in either direction", () => {
    expect(out.map((r) => r.name)).toEqual(["Hiking", "Education", "Old hobby", "No category"]);
  });
  it("carries sub-categories through, even when only one period has them", () => {
    expect(out[0].children).toEqual([expect.objectContaining({ name: "Gear", a: { total: 0, count: 0 }, b: { total: 15600, count: 4 }, change: 15600 })]);
  });
  it("never loses or invents money in either period", () => {
    const sum = (k: "a" | "b") => out.reduce((s, r) => s + r[k].total, 0);
    expect(sum("a")).toBe(a.reduce((s, r) => s + r.total, 0));
    expect(sum("b")).toBe(b.reduce((s, r) => s + r.total, 0));
  });
});

describe("buildComparison", () => {
  it("compares totals and net, second period against first", () => {
    const c = buildComparison(summary(3800000, 2150000, [], "2026-07"), summary(4200000, 2745000, [], "2026-09"));
    expect(c.income).toMatchObject({ change: 400000 });
    expect(c.expenses).toMatchObject({ change: 595000 });
    expect(c.net).toEqual({ a: 1650000, b: 1455000, change: -195000 });
    expect(c.a.month).toBe("2026-07");
    expect(c.b.month).toBe("2026-09");
  });
});

describe("comparisonQuery", () => {
  it("accepts nothing (defaults), two months, or two date ranges", () => {
    expect(comparisonQuery.parse({})).toEqual({ a: undefined, b: undefined });
    expect(comparisonQuery.parse({ a: "2026-07", b: "2026-09" })).toEqual({ a: { month: "2026-07" }, b: { month: "2026-09" } });
    expect(comparisonQuery.parse({ aFrom: "2026-07-01", aTo: "2026-07-15", b: "2026-09" })).toEqual({ a: { from: "2026-07-01", to: "2026-07-15" }, b: { month: "2026-09" } });
  });
  it("rejects a lone period, mixed forms, half ranges and reversed ranges", () => {
    for (const q of [
      { a: "2026-07" },
      { a: "2026-07", aFrom: "2026-07-01", aTo: "2026-07-31", b: "2026-09" },
      { a: "2026-07", bFrom: "2026-09-01" },
      { aFrom: "2026-07-20", aTo: "2026-07-01", b: "2026-09" },
      { a: "2026-13", b: "2026-09" },
    ]) expect(comparisonQuery.safeParse(q).success).toBe(false);
  });
});

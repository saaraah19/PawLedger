import { describe, expect, it } from "vitest";
import { categoryActual, monthProgress, planReview } from "../src/services/plan.logic";

describe("monthProgress", () => {
  it("measures how much of a month has passed", () => {
    expect(monthProgress("2026-09", "2026-09-15")).toEqual({ state: "current", day: 15, daysInMonth: 30, elapsedShare: 0.5 });
    expect(monthProgress("2026-09", "2026-09-30").elapsedShare).toBe(1);
  });
  it("treats earlier months as complete and later months as not begun", () => {
    expect(monthProgress("2026-08", "2026-09-15")).toMatchObject({ state: "past", elapsedShare: 1, daysInMonth: 31 });
    expect(monthProgress("2026-10", "2026-09-15")).toMatchObject({ state: "future", elapsedShare: 0 });
  });
});

const rows = [
  { categoryId: "hiking", name: "Hiking", total: 15600, count: 4, children: [{ categoryId: "gear", name: "Gear", total: 12000, count: 2 }] },
  { categoryId: "food", name: "Groceries", total: 10600, count: 4, children: [] },
  { categoryId: null, name: "No category", total: 700, count: 2, children: [] },
];

describe("categoryActual", () => {
  it("counts a top-level category with its sub-categories, and a sub-category on its own", () => {
    expect(categoryActual(rows, "hiking")).toEqual({ total: 15600, count: 4 });
    expect(categoryActual(rows, "gear")).toEqual({ total: 12000, count: 2 });
  });
  it("is zero for a category with no spending", () => {
    expect(categoryActual(rows, "nothing")).toEqual({ total: 0, count: 0 });
    expect(categoryActual([], "hiking")).toEqual({ total: 0, count: 0 });
  });
});

describe("planReview", () => {
  const names = new Map([["hiking", "Hiking"], ["food", "Groceries"]]);
  const actual = { expenses: { total: 26900, count: 10 }, income: { total: 42000 }, categories: rows };
  const plan = { expectedSpending: 30000, expectedIncome: 40000, expectedSaving: 8000, categories: [{ categoryId: "food", amount: 11000 }, { categoryId: "hiking", amount: 10000 }] };

  it("sets spending, income and saving against what happened", () => {
    const r = planReview(plan, actual, names, 7000);
    expect(r.spending).toEqual({ expected: 30000, actual: 26900, difference: -3100, usedShare: 26900 / 30000 });
    expect(r.income).toMatchObject({ expected: 40000, actual: 42000, difference: 2000 });
    expect(r.saving).toEqual({ expected: 8000, actual: 7000, difference: -1000 });
  });
  it("orders category lines by how much of the expectation was used, most first", () => {
    const r = planReview(plan, actual, names, null);
    expect(r.categories.map((c) => [c.name, Math.round(c.usedShare * 100)])).toEqual([["Hiking", 156], ["Groceries", 96]]);
  });
  it("leaves out what wasn't planned, and has no saving figure until the savings are known", () => {
    const r = planReview({ expectedSpending: 30000 }, actual, names, 7000);
    expect(r.income).toBeNull();
    expect(r.saving).toBeNull();
    expect(r.categories).toEqual([]);
    expect(planReview(plan, actual, names, null).saving).toEqual({ expected: 8000, actual: null, difference: null });
  });
  it("copes with a category that has since been removed from the names, without inventing one", () => {
    const r = planReview({ expectedSpending: 100, categories: [{ categoryId: "ghost", amount: 50 }] }, actual, names, null);
    expect(r.categories[0]).toMatchObject({ name: "Unknown category", actual: 0, usedShare: 0 });
  });
});

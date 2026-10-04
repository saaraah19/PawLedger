import { lastDayOf } from "./analytics.range";
import type { CategoryRow } from "./analytics.rollup";

// Pure rules for the monthly plan: what you expected to spend, against what you did.

export type MonthState = { state: "past" | "current" | "future"; day: number; daysInMonth: number; elapsedShare: number };

export function monthProgress(month: string, today: string): MonthState {
  const currentMonth = today.slice(0, 7);
  const daysInMonth = lastDayOf(month);
  if (month < currentMonth) return { state: "past", day: daysInMonth, daysInMonth, elapsedShare: 1 };
  if (month > currentMonth) return { state: "future", day: 0, daysInMonth, elapsedShare: 0 };
  const day = Number(today.slice(8, 10));
  return { state: "current", day, daysInMonth, elapsedShare: day / daysInMonth };
}

/** What was actually spent in one category: a top-level one includes its sub-categories; a sub-category counts alone. */
export function categoryActual(rows: CategoryRow[], categoryId: string): { total: number; count: number } {
  for (const r of rows) {
    if (r.categoryId === categoryId) return { total: r.total, count: r.count };
    const child = r.children.find((c) => c.categoryId === categoryId);
    if (child) return { total: child.total, count: child.count };
  }
  return { total: 0, count: 0 };
}

export type PlanLike = {
  expectedSpending: number; expectedIncome?: number | null; expectedSaving?: number | null;
  categories?: { categoryId: string; amount: number }[] | null;
};
export type Actual = { expenses: { total: number; count: number }; income: { total: number }; categories: CategoryRow[] };

/** The plan set against what happened. `usedShare` is actual over expected (1 means exactly as expected). */
export function planReview(plan: PlanLike, actual: Actual, names: Map<string, string>, savedActual: number | null) {
  const line = (expected: number, got: number) => ({ expected, actual: got, difference: got - expected, usedShare: got / expected });
  return {
    spending: line(plan.expectedSpending, actual.expenses.total),
    income: plan.expectedIncome ? line(plan.expectedIncome, actual.income.total) : null,
    saving: plan.expectedSaving
      ? { expected: plan.expectedSaving, actual: savedActual, difference: savedActual === null ? null : savedActual - plan.expectedSaving }
      : null,
    categories: (plan.categories ?? [])
      .map((c) => {
        const a = categoryActual(actual.categories, c.categoryId);
        return { categoryId: c.categoryId, name: names.get(c.categoryId) ?? "Unknown category", ...line(c.amount, a.total), count: a.count };
      })
      .sort((x, y) => y.usedShare - x.usedShare || x.name.localeCompare(y.name)),
  };
}

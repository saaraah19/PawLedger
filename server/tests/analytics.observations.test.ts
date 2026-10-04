import { describe, expect, it } from "vitest";
import { buildObservations, ObservationInput, RULES } from "../src/services/analytics.observations";

const cat = (categoryId: string | null, name: string, total: number, count = 1) => ({ categoryId, name, total, count, children: [] });

// A month with enough data for most rules to be able to fire; each test overrides what it needs.
function input(over: Partial<ObservationInput> = {}): ObservationInput {
  return {
    month: "2026-09",
    comparedWith: { from: "2026-08-01", to: "2026-08-31", partial: false, month: "2026-08" },
    current: { expenses: { total: 100000, count: 8 }, largest: [{ amount: 10000 }, { amount: 9000 }, { amount: 8000 }], categories: [] },
    previous: { expenses: { total: 100000, count: 8 }, categories: [] },
    spendingTypes: [],
    months: [],
    ...over,
  };
}
const kinds = (i: ObservationInput) => buildObservations(i).map((o) => o.kind);
const find = <K extends string>(i: ObservationInput, kind: K) => buildObservations(i).find((o) => o.kind === kind) as any;

describe("with too little data", () => {
  it("says nothing for a month with fewer than the minimum expenses", () => {
    const i = input({ current: { expenses: { total: 500000, count: RULES.minExpenses - 1 }, largest: [], categories: [] } });
    expect(buildObservations(i)).toEqual([]);
  });
  it("says nothing for an empty month", () => {
    expect(buildObservations(input({ current: { expenses: { total: 0, count: 0 }, largest: [], categories: [] } }))).toEqual([]);
  });
});

describe("spending_change", () => {
  it("reports a rise or fall of at least 10% against the comparison period", () => {
    const up = find(input({ current: { expenses: { total: 131000, count: 8 }, largest: [], categories: [] } }), "spending_change");
    expect(up).toMatchObject({ current: 131000, previous: 100000, change: 31000 });
    expect(up.changePct).toBeCloseTo(0.31);
    expect(find(input({ current: { expenses: { total: 60000, count: 8 }, largest: [], categories: [] } }), "spending_change").change).toBe(-40000);
  });
  it("stays quiet for small changes and when there is nothing to compare with", () => {
    expect(kinds(input({ current: { expenses: { total: 105000, count: 8 }, largest: [], categories: [] } }))).not.toContain("spending_change");
    expect(kinds(input({ current: { expenses: { total: 131000, count: 8 }, largest: [], categories: [] }, previous: { expenses: { total: 0, count: 0 }, categories: [] } }))).not.toContain("spending_change");
  });
  it("carries whether the comparison was for the same days only", () => {
    const partial = { from: "2026-08-01", to: "2026-08-14", partial: true };
    const o = find(input({ comparedWith: partial, current: { expenses: { total: 150000, count: 8 }, largest: [], categories: [] } }), "spending_change");
    expect(o.comparedWith.partial).toBe(true);
  });
});

describe("unusual_high", () => {
  const months = (vals: number[]) => vals.map((expenses, n) => ({ month: `2026-0${3 + n}`, expenses })); // Mar..Aug
  it("fires when the month is at least 1.5x the average of the previous months with spending", () => {
    const o = find(input({ current: { expenses: { total: 150000, count: 8 }, largest: [], categories: [] }, months: months([100000, 100000, 100000, 100000, 100000, 100000]) }), "unusual_high");
    expect(o).toMatchObject({ average: 100000, months: 6 });
    expect(o.ratio).toBeCloseTo(1.5);
  });
  it("ignores months with no spending when averaging, and needs at least 3 months of history", () => {
    const o = find(input({ current: { expenses: { total: 300000, count: 8 }, largest: [], categories: [] }, months: months([0, 0, 100000, 100000, 100000, 0]) }), "unusual_high");
    expect(o).toMatchObject({ average: 100000, months: 3 });
    expect(kinds(input({ current: { expenses: { total: 900000, count: 8 }, largest: [], categories: [] }, months: months([0, 0, 0, 0, 100000, 100000]) }))).not.toContain("unusual_high");
  });
  it("does not fire just below the threshold", () => {
    expect(kinds(input({ current: { expenses: { total: 149000, count: 8 }, largest: [], categories: [] }, months: months([100000, 100000, 100000, 100000, 100000, 100000]) }))).not.toContain("unusual_high");
  });
});

describe("highest_month", () => {
  const year = (vals: number[]) => vals.map((expenses, n) => ({ month: `2026-0${n + 1}`, expenses }));
  it("fires when this month tops every other month of the year so far, with enough months to say so", () => {
    const o = find(input({ current: { expenses: { total: 200000, count: 8 }, largest: [], categories: [] }, months: [...year([50000, 80000, 90000, 70000, 60000, 90000, 100000, 120000]), { month: "2026-09", expenses: 200000 }] }), "highest_month");
    expect(o).toMatchObject({ month: "2026-09", year: "2026", monthsWithData: 9 });
  });
  it("does not fire on a tie, with too few months, or when an earlier month was higher", () => {
    const cur = { expenses: { total: 100000, count: 8 }, largest: [], categories: [] };
    expect(kinds(input({ current: cur, months: [...year([100000]), { month: "2026-09", expenses: 100000 }] }))).not.toContain("highest_month");
    expect(kinds(input({ current: cur, months: [{ month: "2026-08", expenses: 50000 }, { month: "2026-09", expenses: 100000 }] }))).not.toContain("highest_month");
    expect(kinds(input({ current: cur, months: [...year([90000, 300000, 20000]), { month: "2026-09", expenses: 100000 }] }))).not.toContain("highest_month");
  });
  it("only looks at the same calendar year", () => {
    const cur = { expenses: { total: 100000, count: 8 }, largest: [], categories: [] };
    const months = [{ month: "2025-11", expenses: 900000 }, { month: "2026-07", expenses: 10000 }, { month: "2026-08", expenses: 20000 }, { month: "2026-09", expenses: 100000 }];
    expect(kinds(input({ current: cur, months }))).toContain("highest_month");
  });
});

describe("category_increase", () => {
  const cur = { expenses: { total: 100000, count: 8 }, largest: [], categories: [cat("hiking", "Hiking", 60000, 4), cat("edu", "Education", 40000)] };
  const prev = { expenses: { total: 100000, count: 8 }, categories: [cat("hiking", "Hiking", 20000), cat("edu", "Education", 80000)] };
  it("names the category that grew the most", () => {
    expect(find(input({ current: cur, previous: prev }), "category_increase")).toMatchObject({ name: "Hiking", current: 60000, previous: 20000, change: 40000 });
  });
  it("counts a category that is new this period, without a percentage", () => {
    const o = find(input({ current: cur, previous: { expenses: { total: 100000, count: 8 }, categories: [cat("edu", "Education", 100000)] } }), "category_increase");
    expect(o).toMatchObject({ name: "Hiking", previous: 0, changePct: null });
  });
  it("ignores uncategorised spending, trivial increases, and having no previous period", () => {
    expect(kinds(input({ current: { ...cur, categories: [cat(null, "No category", 60000)] }, previous: { expenses: { total: 100000, count: 8 }, categories: [] } }))).not.toContain("category_increase");
    const tiny = { ...cur, categories: [cat("x", "Tiny", 4000), cat("y", "Big", 96000)] };
    expect(find(input({ current: tiny, previous: { expenses: { total: 100000, count: 8 }, categories: [cat("y", "Big", 96000)] } }), "category_increase")).toBeUndefined();
    expect(kinds(input({ current: cur, previous: { expenses: { total: 0, count: 0 }, categories: [] } }))).not.toContain("category_increase");
  });
});

describe("largest_share", () => {
  it("reports what the three largest purchases make up when they dominate and there are enough purchases", () => {
    const big = { expenses: { total: 100000, count: 8 }, largest: [{ amount: 20000 }, { amount: 15000 }, { amount: 11000 }], categories: [] };
    expect(find(input({ current: big }), "largest_share")).toMatchObject({ total: 46000, expensesTotal: 100000, share: 0.46 });
  });
  it("stays quiet below 40%, or with too few purchases for 'largest three' to mean anything", () => {
    expect(kinds(input())).not.toContain("largest_share"); // 27%
    const few = { expenses: { total: 100000, count: RULES.largestMinCount - 1 }, largest: [{ amount: 50000 }, { amount: 30000 }, { amount: 10000 }], categories: [] };
    expect(kinds(input({ current: few }))).not.toContain("largest_share");
  });
});

describe("spending_types", () => {
  const types = (n: number, o: number, imp = 0) => [
    { type: "necessity", total: n, count: 2 },
    { type: "good_to_have", total: o - imp, count: 2 },
    { type: "impulse", total: imp, count: 1 },
  ];
  it("compares necessities with optional purchases, optional including impulse", () => {
    expect(find(input({ spendingTypes: types(30000, 50000, 10000) }), "spending_types")).toMatchObject({ necessity: 30000, optional: 50000, impulse: 10000, classifiedShare: 0.8 });
  });
  it("needs both sides, and most spending to have a type", () => {
    expect(kinds(input({ spendingTypes: [{ type: "necessity", total: 90000, count: 4 }] }))).not.toContain("spending_types");
    expect(kinds(input({ spendingTypes: types(10000, 20000) }))).not.toContain("spending_types"); // only 30% typed
    expect(kinds(input({ spendingTypes: [...types(30000, 40000), { type: null, total: 30000, count: 2 }, { type: "other", total: 5000, count: 1 }] }))).toContain("spending_types");
  });
});

describe("category_count", () => {
  it("reports the top categorised area and how many purchases it took", () => {
    const cur = { expenses: { total: 100000, count: 8 }, largest: [], categories: [cat(null, "No category", 70000, 3), cat("hiking", "Hiking", 30000, 4)] };
    expect(find(input({ current: cur }), "category_count")).toMatchObject({ name: "Hiking", count: 4, total: 30000 });
  });
  it("needs at least two purchases", () => {
    expect(kinds(input({ current: { expenses: { total: 100000, count: 8 }, largest: [], categories: [cat("h", "Hiking", 30000, 1)] } }))).not.toContain("category_count");
  });
});

describe("determinism", () => {
  it("returns the same observations, in a fixed order, every time", () => {
    const i = input({
      current: { expenses: { total: 200000, count: 8 }, largest: [{ amount: 60000 }, { amount: 40000 }, { amount: 20000 }], categories: [cat("hiking", "Hiking", 120000, 4)] },
      previous: { expenses: { total: 100000, count: 8 }, categories: [cat("hiking", "Hiking", 20000)] },
      spendingTypes: [{ type: "necessity", total: 60000, count: 2 }, { type: "impulse", total: 100000, count: 3 }],
      months: [{ month: "2026-06", expenses: 90000 }, { month: "2026-07", expenses: 100000 }, { month: "2026-08", expenses: 110000 }, { month: "2026-09", expenses: 200000 }],
    });
    expect(kinds(i)).toEqual(["spending_change", "unusual_high", "highest_month", "category_increase", "largest_share", "spending_types", "category_count"]);
    expect(buildObservations(i)).toEqual(buildObservations(i));
  });
});

describe("plan rules", () => {
  const plan = (over: Record<string, unknown> = {}) => ({ expectedSpending: 150000, categories: [] as { categoryId: string; name: string; expected: number; actual: number }[], ...over });
  const running = { state: "current" as const, elapsedShare: 0.5 };

  it("always sets spending against the plan when there is one, and says how far through the month it is", () => {
    const o = find(input({ plan: plan(), monthState: running }), "plan_spending");
    expect(o).toMatchObject({ expected: 150000, actual: 100000, isCurrent: true, elapsedShare: 0.5 });
    expect(o.usedShare).toBeCloseTo(2 / 3);
  });
  it("treats a finished month as finished", () => {
    expect(find(input({ plan: plan(), monthState: { state: "past", elapsedShare: 1 } }), "plan_spending")).toMatchObject({ isCurrent: false, elapsedShare: 1 });
  });
  it("says nothing about a plan when none was set", () => {
    const k = kinds(input());
    expect(k).not.toContain("plan_spending");
    expect(k).not.toContain("plan_category");
  });
  it("comes first, ahead of the other observations", () => {
    expect(kinds(input({ plan: plan(), monthState: running }))[0]).toBe("plan_spending");
  });
  it("names the planned category that is furthest past its expectation, and nothing when all are within", () => {
    const lines = [
      { categoryId: "a", name: "Hiking", expected: 10000, actual: 15600 },
      { categoryId: "b", name: "Groceries", expected: 11000, actual: 12000 },
      { categoryId: "c", name: "Education", expected: 5000, actual: 4500 },
    ];
    expect(find(input({ plan: plan({ categories: lines }), monthState: running }), "plan_category")).toMatchObject({ name: "Hiking", expected: 10000, actual: 15600 });
    expect(kinds(input({ plan: plan({ categories: lines.slice(2) }), monthState: running }))).not.toContain("plan_category");
    expect(kinds(input({ plan: plan({ categories: [{ categoryId: "z", name: "Exactly", expected: 100, actual: 100 }] }), monthState: running }))).not.toContain("plan_category");
  });
  it("stays silent, like every other observation, when there are too few expenses to say anything", () => {
    const sparse = input({ plan: plan(), monthState: running, current: { expenses: { total: 5000, count: RULES.minExpenses - 1 }, largest: [], categories: [] } });
    expect(buildObservations(sparse)).toEqual([]);
  });
});

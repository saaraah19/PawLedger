import { describe, expect, it } from "vitest";
import { buildDemoData, buildDemoPlanning, DEMO_CATEGORIES, DEMO_UNEXPLAINED } from "../src/services/demo.data";
import { bucketEntries, inventoryMonth, reconcile } from "../src/services/inventory.logic";

const parentOf = new Map(DEMO_CATEGORIES.map((c) => [c.key, c.parentKey]));
const kindOf = new Map(DEMO_CATEGORIES.map((c) => [c.key, c.kind]));

describe.each(["2026-09-29", "2026-09-02", "2026-03-01", "2028-03-01", "2026-12-31"])("example accounts, inventories and plans for %s", (today) => {
  const { transactions } = buildDemoData(today);
  const { accounts, inventories, plans } = buildDemoPlanning(today, transactions);
  const accountSet = accounts.map((a) => ({ id: a.key, name: a.name, kind: a.kind, target: a.target ?? null }));
  const invs = inventories.map((iv, i) => ({ id: String(i), month: iv.month, asOf: iv.asOf, balances: iv.balances.map((b) => ({ accountId: b.accountKey, amount: b.amount })) }));

  it("has five inventories, one per month, filed under the month the app's own rule gives them, none in the future", () => {
    expect(inventories).toHaveLength(5);
    expect(new Set(inventories.map((i) => i.month)).size).toBe(5);
    for (const iv of inventories) {
      expect(inventoryMonth(iv.asOf)).toBe(iv.month);
      expect(iv.asOf <= today).toBe(true);
    }
  });
  it("counts every account every time, in whole positive amounts", () => {
    for (const iv of inventories) {
      expect(iv.balances.map((b) => b.accountKey).sort()).toEqual(accounts.map((a) => a.key).sort());
      for (const b of iv.balances) expect(Number.isInteger(b.amount) && b.amount >= 0).toBe(true);
    }
  });
  it("reconciles to exactly the amounts designed as 'unaccounted for', with the same saved each month", () => {
    const periods = reconcile(invs, accountSet, bucketEntries(transactions, invs.map((i) => i.asOf)));
    expect(periods).toHaveLength(4);
    expect(periods.map((p) => p.unexplained)).toEqual(DEMO_UNEXPLAINED);
    expect(periods.every((p) => p.savingsChange === 800_000)).toBe(true);
    expect(periods.every((p) => p.entryCount > 5)).toBe(true);
  });
  it("has plans for the last four months, with spending categories that exist and no category listed with its own parent", () => {
    expect(plans).toHaveLength(4);
    expect(plans.every((p) => p.month <= today.slice(0, 7))).toBe(true);
    for (const p of plans) {
      const keys = (p.categories ?? []).map((c) => c.categoryKey);
      for (const k of keys) {
        expect(kindOf.get(k)).toBe("expense");
        expect(keys.includes(parentOf.get(k) ?? "")).toBe(false);
      }
      expect(p.expectedSpending).toBeGreaterThan(0);
    }
  });
});

describe("the example plans tell a story", () => {
  const { transactions } = buildDemoData("2026-09-29");
  const { plans } = buildDemoPlanning("2026-09-29", transactions);
  it("has the current month's plan expecting more on hiking than usual, which the example hiking purchase exceeds", () => {
    const current = plans.find((p) => p.month === "2026-09")!;
    expect(current.categories!.find((c) => c.categoryKey === "hiking")!.amount).toBe(1_000_000);
  });
  it("is deterministic", () => {
    expect(buildDemoPlanning("2026-09-29", transactions)).toEqual(buildDemoPlanning("2026-09-29", transactions));
  });
});

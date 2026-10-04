import { describe, expect, it } from "vitest";
import { accountBody, inventoryBody, planBody, planQuery } from "../src/schemas/planning.schema";

const id1 = "64b7f0c2a1b2c3d4e5f60718", id2 = "64b7f0c2a1b2c3d4e5f60719";

describe("accountBody", () => {
  it("accepts a savings account with a target, and any account without one", () => {
    expect(accountBody.safeParse({ name: "Savings", kind: "savings", target: 10_000_000 }).success).toBe(true);
    expect(accountBody.safeParse({ name: "Cash", kind: "cash" }).success).toBe(true);
  });
  it("rejects a target on anything but savings, an empty name, a bad kind, and a non-positive target", () => {
    for (const bad of [{ name: "Bank", kind: "bank", target: 5 }, { name: "  ", kind: "cash" }, { name: "X", kind: "crypto" }, { name: "S", kind: "savings", target: 0 }, { name: "S", kind: "savings", target: -5 }]) {
      expect(accountBody.safeParse(bad).success).toBe(false);
    }
  });
});

describe("inventoryBody", () => {
  const ok = { asOf: "2026-09-30", balances: [{ accountId: id1, amount: 120_000 }, { accountId: id2, amount: 0 }] };
  it("accepts balances including zero and negative (an overdraft)", () => {
    expect(inventoryBody.safeParse(ok).success).toBe(true);
    expect(inventoryBody.safeParse({ ...ok, balances: [{ accountId: id1, amount: -5_000 }] }).success).toBe(true);
  });
  it("rejects a repeated account, no balances, fractions, and impossible dates", () => {
    expect(inventoryBody.safeParse({ ...ok, balances: [{ accountId: id1, amount: 1 }, { accountId: id1, amount: 2 }] }).success).toBe(false);
    expect(inventoryBody.safeParse({ ...ok, balances: [] }).success).toBe(false);
    expect(inventoryBody.safeParse({ ...ok, balances: [{ accountId: id1, amount: 1.5 }] }).success).toBe(false);
    expect(inventoryBody.safeParse({ ...ok, asOf: "2026-02-30" }).success).toBe(false);
    expect(inventoryBody.safeParse({ ...ok, asOf: "30/09/2026" }).success).toBe(false);
  });
  it("treats blank notes as no notes", () => {
    expect(inventoryBody.parse({ ...ok, notes: "   " }).notes).toBeUndefined();
  });
});

describe("planBody", () => {
  it("needs only an expected spending amount", () => {
    expect(planBody.safeParse({ expectedSpending: 3_000_000 }).success).toBe(true);
  });
  it("accepts income, saving and category lines", () => {
    expect(planBody.safeParse({ expectedSpending: 3_000_000, expectedIncome: 4_000_000, expectedSaving: 800_000, categories: [{ categoryId: id1, amount: 100 }, { categoryId: id2, amount: 200 }] }).success).toBe(true);
  });
  it("rejects zero or fractional amounts, and a category listed twice", () => {
    expect(planBody.safeParse({ expectedSpending: 0 }).success).toBe(false);
    expect(planBody.safeParse({ expectedSpending: 100.5 }).success).toBe(false);
    expect(planBody.safeParse({ expectedSpending: 100, categories: [{ categoryId: id1, amount: 5 }, { categoryId: id1, amount: 6 }] }).success).toBe(false);
    expect(planBody.safeParse({ expectedSpending: 100, categories: [{ categoryId: "nope", amount: 5 }] }).success).toBe(false);
  });
});

describe("planQuery", () => {
  it("takes an optional month in YYYY-MM form", () => {
    expect(planQuery.safeParse({}).success).toBe(true);
    expect(planQuery.safeParse({ month: "2026-09" }).success).toBe(true);
    expect(planQuery.safeParse({ month: "2026-13" }).success).toBe(false);
    expect(planQuery.safeParse({ month: "September" }).success).toBe(false);
  });
});

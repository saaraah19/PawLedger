import { describe, expect, it } from "vitest";
import { listQuery, transactionBody } from "../src/schemas/transaction.schema";

const base = { type: "expense", amount: 15600, date: "2026-09-28", description: "Decathlon" };

describe("transactionBody", () => {
  it("accepts a simple expense and stores the day at noon UTC", () => {
    const r = transactionBody.parse(base);
    expect(r.date.toISOString()).toBe("2026-09-28T12:00:00.000Z");
  });

  it("accepts items that add up to the total", () => {
    const r = transactionBody.parse({
      ...base,
      items: [
        { name: "Hiking jacket", amount: 8500 },
        { name: "Hiking pants", amount: 5900 },
        { name: "Hiking socks", amount: 1200, quantity: 2 },
      ],
    });
    expect(r.items).toHaveLength(3);
  });

  it("rejects items that do not add up", () => {
    const r = transactionBody.safeParse({ ...base, items: [{ name: "Jacket", amount: 8500 }] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/add up/);
  });

  it.each([0, -5, 12.5, "100", 1e13])("rejects bad amount %s", (amount) => {
    expect(transactionBody.safeParse({ ...base, amount }).success).toBe(false);
  });

  it.each(["2026-02-30", "28/09/2026", "2026-13-01", ""])("rejects bad date %s", (date) => {
    expect(transactionBody.safeParse({ ...base, date }).success).toBe(false);
  });

  it("rejects expense-only fields on income", () => {
    expect(transactionBody.safeParse({ ...base, type: "income", spendingType: "impulse" }).success).toBe(false);
    expect(transactionBody.safeParse({ ...base, type: "income" }).success).toBe(true);
  });

  it("turns blank optional text into nothing", () => {
    expect(transactionBody.parse({ ...base, notes: "   ", merchant: "" }).notes).toBeUndefined();
  });
});

describe("listQuery", () => {
  it("applies defaults and caps the page size", () => {
    expect(listQuery.parse({})).toEqual({ page: 1, limit: 20, sort: "newest" });
    expect(listQuery.safeParse({ limit: "500" }).success).toBe(false);
  });
});

describe("categoryId", () => {
  it("accepts an id and rejects junk", () => {
    expect(transactionBody.safeParse({ ...base, categoryId: "64b7f0c2a1b2c3d4e5f60718" }).success).toBe(true);
    expect(transactionBody.safeParse({ ...base, categoryId: "hiking" }).success).toBe(false);
    expect(listQuery.safeParse({ categoryId: "nope" }).success).toBe(false);
  });
});

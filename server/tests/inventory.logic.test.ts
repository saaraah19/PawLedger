import { describe, expect, it } from "vitest";
import { bucketEntries, inventoryMonth, inventoryPrompt, reconcile, savingsSummary, totalOf, type AccountLike, type InventoryLike } from "../src/services/inventory.logic";

describe("inventoryMonth: which month an inventory belongs to", () => {
  it.each([
    ["2026-09-30", "2026-10"], // counted at the end of September: the start of October
    ["2026-10-01", "2026-10"], // counted on the 1st
    ["2026-10-16", "2026-10"], // the last day that still means "the start of this month"
    ["2026-10-17", "2026-11"], // from the 17th it means the next month's start
    ["2026-12-31", "2027-01"], // across a year boundary
    ["2026-01-01", "2026-01"],
    ["2028-02-29", "2028-03"], // leap day
  ])("counting on %s belongs to %s", (asOf, month) => expect(inventoryMonth(asOf)).toBe(month));
});

describe("bucketEntries", () => {
  const asOfs = ["2026-08-31", "2026-09-30", "2026-10-31"];
  it("puts each entry in the period that ends on or after its date, counting a count-day entry in the period that ends that day", () => {
    const txs = [
      { date: "2026-08-31", type: "expense", amount: 999 }, // on the first count day: belongs to the period BEFORE it, so outside
      { date: "2026-09-01", type: "income", amount: 100 },
      { date: "2026-09-30", type: "expense", amount: 40 }, // on the count day: this period
      { date: "2026-10-01", type: "expense", amount: 10 },
      { date: "2026-10-31", type: "expense", amount: 5 },
      { date: "2026-11-01", type: "expense", amount: 777 }, // after the last count: outside
    ];
    expect(bucketEntries(txs, asOfs)).toEqual([
      { income: 100, expenses: 40, count: 2 },
      { income: 0, expenses: 15, count: 2 },
    ]);
  });
  it("has one bucket fewer than there are inventories, and none for a single inventory", () => {
    expect(bucketEntries([], asOfs)).toHaveLength(2);
    expect(bucketEntries([], ["2026-09-30"])).toEqual([]);
    expect(bucketEntries([], [])).toEqual([]);
  });
});

const accounts: AccountLike[] = [
  { id: "bank", name: "Bank", kind: "bank" },
  { id: "sav", name: "Savings", kind: "savings", target: 100000 },
];
const inv = (id: string, month: string, asOf: string, bank: number, sav: number): InventoryLike => ({ id, month, asOf, balances: [{ accountId: "bank", amount: bank }, { accountId: "sav", amount: sav }] });

describe("reconcile", () => {
  const month = { income: 300, expenses: 100, count: 7 };
  it("explains the change from recorded entries, with a transfer into savings changing nothing about the total", () => {
    // +300 income, -100 spending = +200, and 150 moved from the bank into savings: bank 1000+200-150, savings 500+150
    const [p] = reconcile([inv("a", "2026-09", "2026-08-31", 1000, 500), inv("b", "2026-10", "2026-09-30", 1050, 650)], accounts, [month]);
    expect(p).toMatchObject({ totalBefore: 1500, totalAfter: 1700, change: 200, recordedChange: 200, unexplained: 0, savingsChange: 150, entryCount: 7, days: 30 });
  });
  it("reports money that isn't explained, in either direction, as a plain number", () => {
    const less = reconcile([inv("a", "2026-09", "2026-08-31", 1000, 500), inv("b", "2026-10", "2026-09-30", 1000, 650)], accounts, [month])[0];
    expect(less.unexplained).toBe(-50); // 50 less than the entries explain
    const more = reconcile([inv("a", "2026-09", "2026-08-31", 1000, 500), inv("b", "2026-10", "2026-09-30", 1100, 650)], accounts, [month])[0];
    expect(more.unexplained).toBe(50);
  });
  it("lists every account's own change", () => {
    const [p] = reconcile([inv("a", "2026-09", "2026-08-31", 1000, 500), inv("b", "2026-10", "2026-09-30", 1050, 650)], accounts, [month]);
    expect(p.byAccount).toEqual([
      { accountId: "bank", before: 1000, after: 1050, change: 50 },
      { accountId: "sav", before: 500, after: 650, change: 150 },
    ]);
  });
  it("counts an account missing from one inventory as zero there, so omissions show up rather than hide", () => {
    const second: InventoryLike = { id: "b", month: "2026-10", asOf: "2026-09-30", balances: [{ accountId: "bank", amount: 1200 }] };
    const [p] = reconcile([inv("a", "2026-09", "2026-08-31", 1000, 500), second], accounts, [month]);
    expect(p.byAccount.find((x) => x.accountId === "sav")).toMatchObject({ before: 500, after: 0, change: -500 });
  });
  it("handles negative balances (an overdraft) and has no periods for fewer than two inventories", () => {
    expect(totalOf([{ accountId: "bank", amount: -200 }, { accountId: "sav", amount: 500 }])).toBe(300);
    expect(reconcile([inv("a", "2026-09", "2026-08-31", 1, 1)], accounts, [])).toEqual([]);
    expect(reconcile([], accounts, [])).toEqual([]);
  });
  it("chains several inventories into consecutive periods", () => {
    const list = [inv("a", "2026-08", "2026-07-31", 100, 0), inv("b", "2026-09", "2026-08-31", 200, 0), inv("c", "2026-10", "2026-09-30", 150, 0)];
    const periods = reconcile(list, accounts, [{ income: 100, expenses: 0, count: 1 }, { income: 0, expenses: 50, count: 1 }]);
    expect(periods.map((p) => [p.fromMonth, p.toMonth, p.unexplained])).toEqual([["2026-08", "2026-09", 0], ["2026-09", "2026-10", 0]]);
  });
});

describe("savingsSummary", () => {
  const list = [inv("a", "2026-06", "2026-05-31", 0, 500), inv("b", "2026-07", "2026-06-30", 0, 600), inv("c", "2026-08", "2026-07-31", 0, 700), inv("d", "2026-09", "2026-08-31", 0, 800)];
  const periods = reconcile(list, accounts, [{ income: 0, expenses: 0, count: 0 }, { income: 0, expenses: 0, count: 0 }, { income: 0, expenses: 0, count: 0 }]);
  it("reports balance, progress to the target, the recent monthly pace, and the arithmetic of reaching the target", () => {
    const [s] = savingsSummary(accounts, list, periods);
    expect(s).toMatchObject({ accountId: "sav", balance: 800, target: 100000, lastChange: 100 });
    expect(s.progress).toBeCloseTo(0.008);
    expect(s.avgMonthlyChange).toBe(100); // +100 in each of three one-month periods: exactly 100 a month, whatever the days
    expect(s.monthsToTarget).toBe(Math.ceil((100000 - 800) / 100));
  });
  it("counts a skipped month as two, so the monthly pace is not inflated", () => {
    const skipped = [inv("a", "2026-06", "2026-05-31", 0, 500), inv("b", "2026-08", "2026-07-31", 0, 700)]; // no inventory for July
    const p = reconcile(skipped, accounts, [{ income: 0, expenses: 0, count: 0 }]);
    expect(savingsSummary(accounts, skipped, p)[0]).toMatchObject({ lastChange: 200, avgMonthlyChange: 100 });
  });
  it("gives no projection without a target, with a falling balance, or once the target is reached", () => {
    const noTarget = savingsSummary([{ id: "sav", name: "S", kind: "savings" }], list, periods)[0];
    expect(noTarget).toMatchObject({ target: null, progress: null, monthsToTarget: null });
    const falling = [inv("a", "2026-08", "2026-07-31", 0, 900), inv("b", "2026-09", "2026-08-31", 0, 800)];
    const fp = reconcile(falling, accounts, [{ income: 0, expenses: 0, count: 0 }]);
    expect(savingsSummary(accounts, falling, fp)[0].monthsToTarget).toBeNull();
    const done = savingsSummary([{ id: "sav", name: "S", kind: "savings", target: 700 }], list, periods)[0];
    expect(done.monthsToTarget).toBeNull();
    expect(done.progress).toBeGreaterThan(1);
  });
  it("shows a single inventory's balance without inventing a pace, and skips archived accounts with nothing in the latest count", () => {
    const one = savingsSummary(accounts, [list[3]], [])[0];
    expect(one).toMatchObject({ balance: 800, lastChange: null, avgMonthlyChange: null, monthsToTarget: null });
    const archived: AccountLike[] = [...accounts, { id: "old", name: "Old", kind: "savings", archived: true }];
    expect(savingsSummary(archived, list, periods).map((r) => r.accountId)).toEqual(["sav"]);
  });
});

describe("inventoryPrompt", () => {
  it("asks for the current month's inventory during the first week, and the next month's during the last five days", () => {
    expect(inventoryPrompt("2026-10-03", [])).toEqual({ month: "2026-10", reason: "month_start" });
    expect(inventoryPrompt("2026-10-07", [])).toEqual({ month: "2026-10", reason: "month_start" });
    expect(inventoryPrompt("2026-10-27", [])).toEqual({ month: "2026-11", reason: "month_end" });
    expect(inventoryPrompt("2026-10-31", [])).toEqual({ month: "2026-11", reason: "month_end" });
  });
  it("stays quiet in between, and once the inventory has been taken", () => {
    expect(inventoryPrompt("2026-10-08", [])).toBeNull();
    expect(inventoryPrompt("2026-10-26", [])).toBeNull();
    expect(inventoryPrompt("2026-10-03", ["2026-10"])).toBeNull();
    expect(inventoryPrompt("2026-10-28", ["2026-11"])).toBeNull();
  });
  it("follows the real length of each month, and the year boundary", () => {
    expect(inventoryPrompt("2027-02-24", [])).toEqual({ month: "2027-03", reason: "month_end" }); // 28-day February
    expect(inventoryPrompt("2027-02-23", [])).toBeNull();
    expect(inventoryPrompt("2028-02-25", [])).toEqual({ month: "2028-03", reason: "month_end" }); // leap year
    expect(inventoryPrompt("2026-12-29", [])).toEqual({ month: "2027-01", reason: "month_end" });
  });
  it("agrees with inventoryMonth: counting when prompted always files under the month that was asked for", () => {
    for (const day of ["2026-10-01", "2026-10-07", "2026-10-27", "2026-10-31", "2027-02-24", "2026-12-29"]) {
      expect(inventoryMonth(day)).toBe(inventoryPrompt(day, [])!.month);
    }
  });
});

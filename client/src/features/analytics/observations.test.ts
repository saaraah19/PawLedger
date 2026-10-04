import { describe, expect, it } from "vitest";
import type { ComparedWith, Observation } from "./api";
import { describeObservation } from "./observations";

const now = { currency: "DZD", month: "2026-09", isCurrent: true };
const past = { ...now, isCurrent: false };
const full: ComparedWith = { from: "2026-08-01", to: "2026-08-31", partial: false, month: "2026-08" };
const partial: ComparedWith = { from: "2026-08-01", to: "2026-08-14", partial: true };

const all: Observation[] = [
  { kind: "spending_change", current: 131000, previous: 100000, change: 31000, changePct: 0.31, comparedWith: full },
  { kind: "spending_change", current: 60000, previous: 100000, change: -40000, changePct: -0.4, comparedWith: partial },
  { kind: "unusual_high", total: 1500000, average: 900000, ratio: 1.6667, months: 6 },
  { kind: "unusual_high", total: 4285000, average: 2666250, ratio: 1.607, months: 4 },
  { kind: "highest_month", month: "2026-09", total: 2745000, year: "2026", monthsWithData: 9 },
  { kind: "category_increase", categoryId: "h", name: "Hiking", current: 1560000, previous: 250000, change: 1310000, changePct: 5.24, comparedWith: full },
  { kind: "category_increase", categoryId: "p", name: "Photography", current: 500000, previous: 0, change: 500000, changePct: null, comparedWith: full },
  { kind: "largest_share", total: 460000, expensesTotal: 1000000, share: 0.46 },
  { kind: "spending_types", necessity: 300000, optional: 500000, impulse: 100000, classifiedShare: 0.8 },
  { kind: "spending_types", necessity: 500000, optional: 300000, impulse: 0, classifiedShare: 0.8 },
  { kind: "category_count", categoryId: "h", name: "Hiking", count: 4, total: 1560000 },
  { kind: "plan_spending", expected: 3000000, actual: 2745000, usedShare: 0.915, isCurrent: true, elapsedShare: 0.9667 },
  { kind: "plan_spending", expected: 3000000, actual: 2950000, usedShare: 0.9833, isCurrent: false, elapsedShare: 1 },
  { kind: "plan_category", categoryId: "h", name: "Hiking", expected: 1000000, actual: 1560000, usedShare: 1.56 },
];
const said = (i: number, ctx = now) => describeObservation(all[i], ctx);

describe("describeObservation", () => {
  it("words a change against last month or the same days of last month", () => {
    expect(said(0)).toBe("Your spending increased by 310 DZD (31%) compared with August 2026.");
    expect(said(1)).toBe("Your spending decreased by 400 DZD (40%) compared with the same days of last month.");
  });
  it("words unusual spending differently for a running month and a finished one", () => {
    expect(said(2)).toBe("Your spending this month is already 1.7 times your usual month: 15,000 DZD against an average of 9,000 DZD over the 6 previous months that had spending.");
    expect(said(2, past)).toMatch(/^Your spending in September 2026 was 1\.7 times/);
  });
  it("shows an average to the nearest whole amount, not a falsely precise one", () => {
    const text = describeObservation(all[3], now);
    expect(text).toContain("against an average of 26,663 DZD over the 4 previous months");
    expect(text).not.toMatch(/\.50 DZD/);
  });
  it("words the highest month as 'currently' only while it is still running", () => {
    expect(said(4)).toBe("September 2026 is currently your highest-spending month of 2026: 27,450 DZD.");
    expect(said(4, past)).toBe("September 2026 was your highest-spending month of 2026 up to then: 27,450 DZD.");
  });
  it("words a category increase, including a category that is new", () => {
    expect(said(5)).toBe("Hiking spending increased by 13,100 DZD (524%) compared with August 2026.");
    expect(said(6)).toBe("Photography spending was 5,000 DZD this month, with nothing recorded in August 2026.");
    expect(said(6, past)).toBe("Photography spending was 5,000 DZD in September 2026, with nothing recorded in August 2026.");
  });
  it("words the share, the spending types (both ways) and the busiest category", () => {
    expect(said(7)).toBe("Your three largest purchases represent 46% of your total spending this month.");
    expect(said(8)).toBe("Among purchases with a spending type, you spent more on optional ones than on necessities this month: 5,000 DZD against 3,000 DZD. Impulse / unplanned purchases were 1,000 DZD of the optional spending.");
    expect(said(9)).toBe("Among purchases with a spending type, necessities were the larger part this month: 5,000 DZD against 3,000 DZD for optional purchases.");
    expect(said(10)).toBe("You made 4 purchases in Hiking this month, 15,600 DZD in all.");
  });
  it("words the plan observations: a running month with how much of it has passed, a finished month, and a category past its expectation", () => {
    expect(describeObservation(all[all.length - 3], now)).toBe("So far you have spent 27,450 DZD of the 30,000 DZD you expected for this month (92%), with 97% of the month gone.");
    expect(describeObservation(all[all.length - 2], past)).toBe("You expected to spend 30,000 DZD in September 2026 and spent 29,500 DZD (98% of it).");
    expect(describeObservation(all[all.length - 1], now)).toBe("Hiking has used 156% of what you expected: 15,600 DZD against 10,000 DZD.");
  });
  it("only ever reports; it never advises, blames or praises", () => {
    const text = all.flatMap((_, i) => [said(i), said(i, past)]).join(" ");
    expect(text).not.toMatch(/\b(should|stop|avoid|too much|overspen|irresponsible|careful|warning|good|bad|great|wasted|wisely)\b/i);
  });
});

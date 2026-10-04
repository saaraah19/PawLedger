import { describe, expect, it } from "vitest";
import { wholeUnits, countsLabel, describeTotalChange, describeUnaccounted, inventoryLabel, monthsText, promptText, savingsPaceLine } from "./wording";

describe("describeUnaccounted", () => {
  it("says what each direction means, as a plain number", () => {
    expect(describeUnaccounted(0, "DZD")).toBe("Your entries explain the change exactly.");
    expect(describeUnaccounted(-185000, "DZD")).toBe("1,850 DZD less than your entries explain. Money left without an entry, or an entry was larger than what really came in.");
    expect(describeUnaccounted(40000, "DZD")).toBe("400 DZD more than your entries explain. Money arrived without an entry, or an entry was larger than what really went out.");
  });
  it("never blames, advises, or guesses a reason", () => {
    const text = [-185000, 40000, 0].map((n) => describeUnaccounted(n, "DZD")).join(" ");
    expect(text).not.toMatch(/forgot|careless|overspen|wasted|stole|stolen|mistake|fault|should|wrong|\bbad\b|\bgood\b|great|suspicious/i);
  });
});

describe("other wording", () => {
  it("describes a change in the total", () => {
    expect(describeTotalChange({ totalBefore: 10000000, totalAfter: 10500000, change: 500000 }, "DZD")).toBe("Your total went from 100,000 DZD to 105,000 DZD (+5,000 DZD).");
    expect(describeTotalChange({ totalBefore: 500000, totalAfter: 300000, change: -200000 }, "DZD")).toContain("(\u22122,000 DZD)");
  });
  it("counts months, switching to years for long spans", () => {
    expect(monthsText(1)).toBe("about 1 more month");
    expect(monthsText(7)).toBe("about 7 more months");
    expect(monthsText(30)).toBe("about 3 years");
  });
  it("states the savings arithmetic as an 'if', and says nothing without a pace or target", () => {
    expect(savingsPaceLine({ avgMonthlyChange: 800000, monthsToTarget: 8, target: 10000000 }, "DZD")).toBe("If the recent pace of 8,000 DZD a month continued, the target would be reached in about 8 months.");
    expect(savingsPaceLine({ avgMonthlyChange: null, monthsToTarget: null, target: 100 }, "DZD")).toBeNull();
    expect(savingsPaceLine({ avgMonthlyChange: -5, monthsToTarget: null, target: 100 }, "DZD")).toBeNull();
    expect(savingsPaceLine({ avgMonthlyChange: 5, monthsToTarget: 3, target: null }, "DZD")).toBeNull();
  });
  it("rounds a pace to a whole amount rather than showing false precision", () => {
    expect(wholeUnits(794022)).toBe(794000);
    expect(wholeUnits(-185050)).toBe(-185100);
    expect(wholeUnits(185050)).toBe(185100); // symmetric with the negative case
    expect(Object.is(wholeUnits(-49), 0)).toBe(true); // rounds to a plain zero, never -0
    expect(wholeUnits(0)).toBe(0);
    expect(savingsPaceLine({ avgMonthlyChange: 794022, monthsToTarget: 5, target: 1 }, "DZD")).toBe("If the recent pace of 7,940 DZD a month continued, the target would be reached in about 5 months.");
  });
  it("labels inventories and the span between two counts", () => {
    expect(inventoryLabel("2026-11")).toBe("Start of November 2026");
    expect(countsLabel("2026-09-30", "2026-10-31")).toBe("30 Sep 2026 to 31 Oct 2026");
  });
  it("words the Home prompt for the end and the start of a month, without nagging", () => {
    expect(promptText({ month: "2026-11", reason: "month_end" })).toContain("When you are ready");
    expect(promptText({ month: "2026-10", reason: "month_start" })).toContain("if you haven't yet");
    expect(`${promptText({ month: "2026-11", reason: "month_end" })} ${promptText({ month: "2026-10", reason: "month_start" })}`).not.toMatch(/must|overdue|late|forgot|don't forget/i);
  });
});

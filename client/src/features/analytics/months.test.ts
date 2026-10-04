import { describe, expect, it } from "vitest";
import { monthLabel, shiftMonth } from "./months";

describe("months", () => {
  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-09", 0)).toBe("2026-09");
    expect(shiftMonth("2026-03", -14)).toBe("2025-01");
  });
  it("labels months", () => {
    expect(monthLabel("2026-09")).toBe("September 2026");
  });
});

import { endOfLastMonth, lastDayOf, monthsBetween, periodOptions, shortMonthLabel } from "./months";

describe("periodOptions", () => {
  it("offers only the default when there is no data", () => {
    expect(periodOptions(null, "2026-09").map((o) => o.key)).toEqual(["last12"]);
  });
  it("lists years newest first, capping the current year at the current month", () => {
    const opts = periodOptions("2024-05", "2026-09");
    expect(opts.map((o) => o.key)).toEqual(["last12", "y2026", "y2025", "y2024", "all"]);
    expect(opts[1].range).toEqual({ from: "2026-01", to: "2026-09" });
    expect(opts[2].range).toEqual({ from: "2025-01", to: "2025-12" });
    expect(opts[4].range).toEqual({ from: "2024-05", to: "2026-09" });
  });
  it("skips 'All time' when the last 12 months already cover everything, and caps it at 10 years", () => {
    expect(periodOptions("2026-03", "2026-09").map((o) => o.key)).toEqual(["last12", "y2026"]);
    expect(periodOptions("2005-01", "2026-09").at(-1)?.range?.from).toBe("2016-10");
  });
});

describe("shortMonthLabel", () => {
  it("adds the year only when needed", () => {
    expect(shortMonthLabel("2026-09", false)).toBe("Sep");
    expect(shortMonthLabel("2026-09", true)).toBe("Sep \u201926");
  });
});

describe("monthsBetween", () => {
  it("lists months inclusively across a year boundary", () => {
    expect(monthsBetween("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthsBetween("2026-09", "2026-09")).toEqual(["2026-09"]);
    expect(monthsBetween("2026-09", "2026-08")).toEqual([]);
  });
});

describe("lastDayOf / endOfLastMonth", () => {
  it("knows month lengths, including leap years", () => {
    expect(lastDayOf("2026-09")).toBe(30);
    expect(lastDayOf("2026-12")).toBe(31);
    expect(lastDayOf("2027-02")).toBe(28);
    expect(lastDayOf("2028-02")).toBe(29);
  });
  it("finds the end of the previous month from any day, across a year boundary", () => {
    expect(endOfLastMonth("2026-10-03")).toBe("2026-09-30");
    expect(endOfLastMonth("2026-10-31")).toBe("2026-09-30");
    expect(endOfLastMonth("2027-01-05")).toBe("2026-12-31");
    expect(endOfLastMonth("2028-03-01")).toBe("2028-02-29");
  });
});

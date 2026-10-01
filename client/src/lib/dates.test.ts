import { describe, expect, it } from "vitest";
import { formatCalendarDay, shortMonthName, todayIn } from "./dates";

describe("dates", () => {
  it("always writes a three-letter month, whatever the runtime's locale data says", () => {
    expect(formatCalendarDay("2026-09-28T12:00:00.000Z")).toBe("28 Sep 2026");
    expect(formatCalendarDay("2026-01-05T12:00:00.000Z")).toBe("5 Jan 2026");
    expect(Array.from({ length: 12 }, (_, i) => shortMonthName(i + 1)).every((m) => m.length === 3)).toBe(true);
  });
  it("uses the stored calendar day, not the viewer's timezone", () => {
    expect(formatCalendarDay("2026-12-31T12:00:00.000Z")).toBe("31 Dec 2026");
  });
});

describe("todayIn", () => {
  it("returns the calendar day in the given timezone, zero-padded", () => {
    const now = new Date("2026-01-05T23:30:00Z");
    expect(todayIn("UTC", now)).toBe("2026-01-05");
    expect(todayIn("Africa/Algiers", now)).toBe("2026-01-06"); // UTC+1: already tomorrow
    expect(todayIn("America/Los_Angeles", now)).toBe("2026-01-05");
  });
});

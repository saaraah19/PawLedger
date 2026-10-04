import { describe, expect, it } from "vitest";
import { formatAmount, formatCompact, formatMoney, formatNet, formatSigned, minorToInput, parseAmount, parseBalance } from "./money";

describe("parseAmount", () => {
  it.each([
    ["8500", 850000],
    ["8 500", 850000],
    ["8,500", 850000], // three digits after a lone comma = thousands
    ["8.500", 850000],
    ["8500.5", 850050],
    ["8500,50", 850050],
    ["1,234.56", 123456],
    ["1.234,56", 123456],
    ["1.234.567", 123456700],
    ["0.10", 10],
    ["19.99", 1999],
  ])("reads %s as %i minor units", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(["", "abc", "0", "-5", "12.345.6", "1,2,3.4x", "8500.555", "99999999999999999999", "1,2,3.4", "12,34,567", "1234,567", ".5", "5."])("rejects %s", (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it("does not drift the way floats do", () => {
    // 0.1 + 0.2 !== 0.3 in floating point; integers add exactly.
    expect((parseAmount("0.1") ?? 0) + (parseAmount("0.2") ?? 0)).toBe(parseAmount("0.3"));
  });
});

describe("formatMoney / minorToInput", () => {
  it("formats whole and fractional amounts", () => {
    expect(formatMoney(850000, "DZD")).toBe("8,500 DZD");
    expect(formatMoney(850050, "DZD")).toBe("8,500.50 DZD");
  });
  it("round-trips through the edit form", () => {
    for (const minor of [1, 99, 100, 850050, 1560000]) expect(parseAmount(minorToInput(minor))).toBe(minor);
  });
});

describe("formatNet", () => {
  it("signs positive and negative nets, and leaves zero bare", () => {
    expect(formatNet(1455000, "DZD")).toBe("+14,550 DZD");
    expect(formatNet(-300000, "DZD")).toBe("\u22123,000 DZD");
    expect(formatNet(0, "DZD")).toBe("0 DZD");
  });
});

describe("formatCompact", () => {
  it("shortens big axis values", () => {
    expect(formatCompact(850000)).toBe("8.5K");
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(250000000)).toBe("2.5M");
  });
});

describe("digits-only formatters", () => {
  it("format without a currency", () => {
    expect(formatAmount(850000)).toBe("8,500");
    expect(formatAmount(850050)).toBe("8,500.50");
    expect(formatSigned(1310000)).toBe("+13,100");
    expect(formatSigned(-350000)).toBe("\u22123,500");
    expect(formatSigned(0)).toBe("0");
  });
});

describe("parseBalance", () => {
  it("accepts zero, positive and negative balances in the same formats as amounts", () => {
    expect(parseBalance("0")).toBe(0);
    expect(parseBalance("0.00")).toBe(0);
    expect(parseBalance("120 000")).toBe(12000000);
    expect(parseBalance("8,500")).toBe(850000);
    expect(parseBalance("-1,850")).toBe(-185000);
    expect(parseBalance("\u22121850.50")).toBe(-185050); // a typographic minus too
    expect(parseBalance("  -0  ")).toBe(0);
  });
  it("still rejects what is not a clear amount", () => {
    for (const bad of ["", "abc", "--5", "- 5x", "12.345.6", "1234,567", "8500.555", "+5"]) expect(parseBalance(bad)).toBeNull();
  });
  it("round-trips through the edit form, including negatives", () => {
    for (const minor of [0, 1, -1, 850050, -185000, -185050]) expect(parseBalance(minorToInput(minor))).toBe(minor);
  });
  it("leaves parseAmount strict: zero and negatives are not spending amounts", () => {
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
  });
});

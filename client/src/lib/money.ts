// Amounts are stored and sent as integer minor units (e.g. centimes). This file is the only place
// that converts to and from what people type or read. All supported currencies use 2 decimals today;
// a currency with a different exponent would be added here.
const FACTOR = 100;

/**
 * "8500", "8 500", "8,500", "8500.5", "1.234,56" → minor units. Returns null unless it is clearly an amount.
 * A lone "," or "." followed by exactly three digits after a 1–3 digit group ("8,500", "1.234.567") is read
 * as thousands grouping; anything else with a separator must be a decimal with at most 2 digits.
 */
export function parseAmount(raw: string): number | null {
  let s = raw.replace(/[\s\u00a0]/g, "");
  if (!/^[\d.,]+$/.test(s)) return null;
  const grouped = (str: string, sep: string) => new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`).test(str);

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // Both present: the last one is the decimal separator, the other must be valid thousands grouping.
    const dec = Math.max(lastDot, lastComma);
    const group = s[dec] === "." ? "," : ".";
    const intPart = s.slice(0, dec);
    if (!grouped(intPart, group)) return null;
    s = intPart.split(group).join("") + "." + s.slice(dec + 1);
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastComma >= 0 ? "," : ".";
    if (grouped(s, sep)) s = s.split(sep).join("");
    else if (s.split(sep).length === 2) s = s.replace(sep, ".");
    else return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const minor = Number(whole) * FACTOR + Number((frac + "00").slice(0, 2));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

/** 850000 → "8,500"; 850050 → "8,500.50". Digits only, for tables where the currency is stated once. */
export function formatAmount(minor: number): string {
  const decimals = minor % FACTOR === 0 ? 0 : 2; // whole amounts stay clean; fractions always show two digits
  return new Intl.NumberFormat("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(minor / FACTOR);
}

/** 850000 → "8,500 DZD"; 850050 → "8,500.50 DZD". Display only. */
export const formatMoney = (minor: number, currency: string): string => `${formatAmount(minor)} ${currency}`;

/** 850000 → "8500"; 850050 → "8500.50". For filling an edit form. */
export function minorToInput(minor: number): string {
  return minor % FACTOR === 0 ? String(minor / FACTOR) : (minor / FACTOR).toFixed(2);
}

/** "+14,550", "\u22123,000", "0": digits only. */
export function formatSigned(minor: number): string {
  return `${minor > 0 ? "+" : minor < 0 ? "\u2212" : ""}${formatAmount(Math.abs(minor))}`;
}

/** "+14,550 DZD", "\u22123,000 DZD", "0 DZD". */
export const formatNet = (minor: number, currency: string): string => `${formatSigned(minor)} ${currency}`;

/** 850000 → "8.5K"; for chart axes only. */
export function formatCompact(minor: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(minor / FACTOR);
}

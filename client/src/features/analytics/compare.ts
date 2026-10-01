import { formatCalendarDay } from "../../lib/dates";
import { formatMoney } from "../../lib/money";
import type { Delta, PeriodInfo } from "./api";
import { monthLabel } from "./months";

/** "July 2026", or "1 Jul 2026 to 15 Jul 2026" for a custom range. */
export function periodLabel(p: Pick<PeriodInfo, "from" | "to" | "month">): string {
  return p.month ? monthLabel(p.month) : `${formatCalendarDay(p.from)} to ${formatCalendarDay(p.to)}`;
}

/** "+30%", "\u221244%", "new" (nothing in the first period), or "" when there is nothing to say. */
export function formatPct(d: Delta): string {
  if (d.change === 0) return "";
  if (d.changePct === null) return "new";
  const pct = Math.round(d.changePct * 100);
  return `${pct > 0 ? "+" : pct < 0 ? "\u2212" : ""}${Math.abs(pct)}%`;
}

/**
 * One factual sentence about a movement between the first and second period. It says what changed and
 * by how much, never why, and never whether it was good or bad.
 */
export function describeChange(noun: string, d: Delta, currency: string): string {
  const { a, b, change } = d;
  if (a.total === 0 && b.total === 0) return `${noun}: nothing recorded in either period.`;
  if (a.total === 0) return `${noun}: ${formatMoney(b.total, currency)} in the second period, nothing in the first.`;
  if (b.total === 0) return `${noun}: nothing in the second period, ${formatMoney(a.total, currency)} in the first.`;
  if (change === 0) return `${noun} stayed the same at ${formatMoney(a.total, currency)}.`;
  const pct = d.changePct === null ? "" : ` (${Math.round(Math.abs(d.changePct) * 100)}%)`;
  return `${noun} ${change > 0 ? "increased" : "decreased"} by ${formatMoney(Math.abs(change), currency)}${pct}.`;
}

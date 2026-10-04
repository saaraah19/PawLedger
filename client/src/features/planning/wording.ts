import { formatCalendarDay } from "../../lib/dates";
import { formatMoney, formatNet } from "../../lib/money";
import { monthLabel } from "../analytics/months";
import type { SavingsRow } from "./api";

/**
 * What a gap between your records and your counted money means, in plain words and in both directions.
 * It never says why, and never says anyone did something wrong: it only says what the numbers show.
 */
export function describeUnaccounted(unexplained: number, currency: string): string {
  if (unexplained === 0) return "Your entries explain the change exactly.";
  return unexplained > 0
    ? `${formatMoney(unexplained, currency)} more than your entries explain. Money arrived without an entry, or an entry was larger than what really went out.`
    : `${formatMoney(-unexplained, currency)} less than your entries explain. Money left without an entry, or an entry was larger than what really came in.`;
}

export function describeTotalChange(p: { totalBefore: number; totalAfter: number; change: number }, currency: string): string {
  return `Your total went from ${formatMoney(p.totalBefore, currency)} to ${formatMoney(p.totalAfter, currency)} (${formatNet(p.change, currency)}).`;
}

/** "about 3 more months", "about 2 years". */
export function monthsText(months: number): string {
  if (months >= 24) return `about ${Math.round(months / 12)} years`;
  return months <= 1 ? "about 1 more month" : `about ${months} more months`;
}

/** The arithmetic of reaching a target if the recent pace continued. Says "if", never "you should". */
export function savingsPaceLine(row: Pick<SavingsRow, "avgMonthlyChange" | "monthsToTarget" | "target">, currency: string): string | null {
  if (row.monthsToTarget === null || row.avgMonthlyChange === null || !row.target) return null;
  return `If the recent pace of ${formatMoney(wholeUnits(row.avgMonthlyChange), currency)} a month continued, the target would be reached in ${monthsText(row.monthsToTarget).replace(" more", "")}.`;
}

/** An average is approximate: show it to the nearest whole unit of currency, not as 7,940.22. */
// Half away from zero in both directions (Math.round alone rounds -1850.5 toward zero), and never a displayed "-0".
export const wholeUnits = (minor: number) => (Math.sign(minor) * Math.round(Math.abs(minor) / 100) * 100) || 0;

/** "Start of November 2026": the month an inventory opens. */
export const inventoryLabel = (month: string) => `Start of ${monthLabel(month)}`;

/** "30 Sep 2026 to 31 Oct 2026". */
export const countsLabel = (fromAsOf: string, toAsOf: string) => `${formatCalendarDay(fromAsOf)} to ${formatCalendarDay(toAsOf)}`;

/** What the prompt on Home says. */
export function promptText(p: { month: string; reason: "month_end" | "month_start" }): string {
  return p.reason === "month_end"
    ? `The month is nearly over. When you are ready, count what you hold in each account for the start of ${monthLabel(p.month)}.`
    : `${monthLabel(p.month)} has started. Count what you hold in each account, if you haven't yet.`;
}

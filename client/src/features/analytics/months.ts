import { shortMonthName } from "../../lib/dates";

/** "2026-01" shifted by ±n months → "2025-12". */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Every month from `from` to `to` inclusive. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from; m <= to; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

/** "2026-09" → "September 2026". */
export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));

export type MonthRange = { from: string; to: string };
export type PeriodOption = { key: string; label: string; range?: MonthRange }; // no range = server default (last 12 months)

/**
 * Choices for the period picker: the last 12 months, each calendar year that has data, and all time.
 * The current year stops at the current month so charts don't trail off into empty future months.
 */
export function periodOptions(firstMonth: string | null, currentMonth: string): PeriodOption[] {
  const options: PeriodOption[] = [{ key: "last12", label: "Last 12 months" }];
  if (!firstMonth) return options;
  const firstYear = Number(firstMonth.slice(0, 4));
  const currentYear = Number(currentMonth.slice(0, 4));
  for (let y = currentYear; y >= firstYear; y--) {
    const to = y === currentYear ? currentMonth : `${y}-12`;
    options.push({ key: `y${y}`, label: String(y), range: { from: `${y}-01`, to } });
  }
  if (firstMonth < shiftMonth(currentMonth, -11)) {
    const earliestAllowed = shiftMonth(currentMonth, -119); // the server caps a range at 10 years
    options.push({ key: "all", label: "All time", range: { from: firstMonth > earliestAllowed ? firstMonth : earliestAllowed, to: currentMonth } });
  }
  return options;
}

/** "Sep" when every month is in one year, otherwise "Sep \u201926". */
export function shortMonthLabel(month: string, showYear: boolean): string {
  const name = shortMonthName(Number(month.slice(5, 7)));
  return showYear ? `${name} \u2019${month.slice(2, 4)}` : name;
}

/** The last day of "2026-09" as a number (30). */
export function lastDayOf(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** "2026-09-30": the last day of the month before the one `today` is in. */
export function endOfLastMonth(today: string): string {
  const prev = shiftMonth(today.slice(0, 7), -1);
  return `${prev}-${String(lastDayOf(prev)).padStart(2, "0")}`;
}

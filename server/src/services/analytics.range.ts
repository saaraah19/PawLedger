/** Today's calendar day (YYYY-MM-DD) in the given IANA timezone. */
export function todayIn(timeZone: string, now = new Date()): string {
  // Built from parts, not from a locale's date format, so it can't change between Node versions.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export const lastDayOf = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export type ResolvedRange = { from: string; to: string; month?: string; currentMonth: string };

/**
 * Turns a query into inclusive calendar days. No query means the current month in the user's timezone,
 * which is the one place the server needs the timezone: transactions themselves are plain calendar days.
 */
export function resolveRange(q: { month?: string; from?: string; to?: string }, timeZone: string, now = new Date()): ResolvedRange {
  const currentMonth = todayIn(timeZone, now).slice(0, 7);
  if (q.from && q.to) return { from: q.from, to: q.to, currentMonth };
  const month = q.month ?? currentMonth;
  return { month, from: `${month}-01`, to: `${month}-${String(lastDayOf(month)).padStart(2, "0")}`, currentMonth };
}

/** Stored dates sit at noon UTC of their calendar day, so whole-day bounds catch exactly the right ones. */
export function rangeBounds(from: string, to: string) {
  return { start: new Date(`${from}T00:00:00.000Z`), end: new Date(`${to}T23:59:59.999Z`) };
}

// ---- month ranges (Analyze) ----

export const monthIndex = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + (m - 1);
};

export function shiftMonth(month: string, delta: number): string {
  const idx = monthIndex(month) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

/** Every month from `from` to `to` inclusive, as "YYYY-MM". */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let i = monthIndex(from); i <= monthIndex(to); i++) out.push(shiftMonth("0000-01", i));
  return out;
}

export const MAX_MONTHS = 120;

/** No range means the last 12 months ending with the current month in the user's timezone. */
export function resolveMonthRange(q: { from?: string; to?: string }, timeZone: string, now = new Date()) {
  const currentMonth = todayIn(timeZone, now).slice(0, 7);
  if (q.from && q.to) return { from: q.from, to: q.to, currentMonth };
  return { from: shiftMonth(currentMonth, -11), to: currentMonth, currentMonth };
}

/** Whole-day bounds covering the first day of `from` to the last day of `to`. */
export function monthBounds(from: string, to: string) {
  return rangeBounds(`${from}-01`, `${to}-${String(lastDayOf(to)).padStart(2, "0")}`);
}

/** One entry per month in the range, zero-filled where there was no activity, so charts have no gaps. */
export function fillMonths<T>(months: string[], byMonth: Map<string, T>, empty: T): ({ month: string } & T)[] {
  return months.map((month) => ({ month, ...(byMonth.get(month) ?? empty) }));
}

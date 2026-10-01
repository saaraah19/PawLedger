// Month abbreviations are fixed on purpose: Intl's short month names differ between engines and versions
// ("Sep" vs "Sept"), and this app promises an unambiguous "28 Sep 2026" everywhere.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sep" for month number 1–12. */
export const shortMonthName = (month1to12: number) => MONTHS[month1to12 - 1];

/** A stored ISO date → "28 Sep 2026". The calendar day is the date's UTC day (see the Transaction model). */
export function formatCalendarDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${shortMonthName(m)} ${y}`;
}

/** Today's calendar day (YYYY-MM-DD) in an IANA timezone, built from parts so it can't depend on locale data. */
export function todayIn(timeZone: string, now = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

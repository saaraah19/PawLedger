import { mergeCategories } from "./analytics.compare";
import { shiftMonth } from "./analytics.range";
import type { CategoryRow } from "./analytics.rollup";

/**
 * Thresholds for every rule. An observation only appears when there is enough data behind it and the
 * difference is large enough to be worth mentioning; otherwise the app says nothing rather than guess.
 */
export const RULES = {
  minExpenses: 3, // fewer expenses than this in the month: no observations at all
  changeMinPct: 0.1, // spending must differ from the comparison period by at least 10%
  unusualRatio: 1.5, // this month at least 1.5x the usual month...
  unusualWindow: 6, // ...where "usual" is the previous 6 months...
  unusualMinMonths: 3, // ...and needs at least 3 of them to have spending
  highestMinMonths: 3, // "highest month of the year" needs at least 3 months of spending that year
  categoryMinShare: 0.05, // a category increase must involve at least 5% of the month's spending
  largestMinCount: 6, // "your three largest purchases..." needs at least 6 expenses
  largestMinShare: 0.4, // ...and those three must make up at least 40%
  typesMinClassified: 0.6, // spending-type comparison needs 60% of spending to have a type
  categoryMinCount: 2, // "n purchases in X" needs at least 2 purchases
} as const;

type Side = { total: number; count: number };
export type ComparedWith = { from: string; to: string; partial: boolean; month?: string };

export type Observation =
  | { kind: "spending_change"; current: number; previous: number; change: number; changePct: number; comparedWith: ComparedWith }
  | { kind: "unusual_high"; total: number; average: number; ratio: number; months: number }
  | { kind: "highest_month"; month: string; total: number; year: string; monthsWithData: number }
  | { kind: "category_increase"; categoryId: string; name: string; current: number; previous: number; change: number; changePct: number | null; comparedWith: ComparedWith }
  | { kind: "largest_share"; total: number; expensesTotal: number; share: number }
  | { kind: "spending_types"; necessity: number; optional: number; impulse: number; classifiedShare: number }
  | { kind: "category_count"; categoryId: string; name: string; count: number; total: number };

export type ObservationInput = {
  month: string;
  comparedWith: ComparedWith;
  current: { expenses: Side; largest: { amount: number }[]; categories: CategoryRow[] };
  previous: { expenses: Side; categories: CategoryRow[] };
  spendingTypes: { type: string | null; total: number; count: number }[];
  months: { month: string; expenses: number }[]; // zero-filled monthly series covering the year so far and the previous 6 months
};

const OPTIONAL_TYPES = ["good_to_have", "complementary", "impulse"];

/** Pure and deterministic: the same data always gives the same observations, in a fixed order. */
export function buildObservations(i: ObservationInput): Observation[] {
  const cur = i.current.expenses;
  const prev = i.previous.expenses;
  if (cur.count < RULES.minExpenses || cur.total <= 0) return [];
  const out: Observation[] = [];

  // 1. Spending against the comparison period (the same days of last month while this month is still running)
  if (prev.total > 0) {
    const change = cur.total - prev.total;
    const changePct = change / prev.total;
    if (Math.abs(changePct) >= RULES.changeMinPct) {
      out.push({ kind: "spending_change", current: cur.total, previous: prev.total, change, changePct, comparedWith: i.comparedWith });
    }
  }

  // 2. Unusually high against the previous months that actually had spending
  const windowStart = shiftMonth(i.month, -RULES.unusualWindow);
  const prior = i.months.filter((m) => m.month < i.month && m.month >= windowStart && m.expenses > 0);
  if (prior.length >= RULES.unusualMinMonths) {
    const average = prior.reduce((s, m) => s + m.expenses, 0) / prior.length;
    if (cur.total >= RULES.unusualRatio * average) {
      out.push({ kind: "unusual_high", total: cur.total, average: Math.round(average), ratio: cur.total / average, months: prior.length });
    }
  }

  // 3. Highest-spending month of the calendar year so far
  const year = i.month.slice(0, 4);
  const thisYear = i.months.filter((m) => m.month.startsWith(year) && m.month <= i.month && m.expenses > 0);
  if (thisYear.length >= RULES.highestMinMonths && thisYear.filter((m) => m.month !== i.month).every((m) => cur.total > m.expenses)) {
    out.push({ kind: "highest_month", month: i.month, total: cur.total, year, monthsWithData: thisYear.length });
  }

  // 4. The category whose spending grew the most
  if (prev.total > 0) {
    const best = mergeCategories(i.previous.categories, i.current.categories)
      .filter((r) => r.categoryId !== null && r.change > 0 && r.b.total >= RULES.categoryMinShare * cur.total)
      .sort((x, y) => y.change - x.change)[0];
    if (best && best.categoryId) {
      out.push({ kind: "category_increase", categoryId: best.categoryId, name: best.name, current: best.b.total, previous: best.a.total, change: best.change, changePct: best.changePct, comparedWith: i.comparedWith });
    }
  }

  // 5. How much the three biggest purchases account for
  if (cur.count >= RULES.largestMinCount && i.current.largest.length >= 3) {
    const total = i.current.largest.slice(0, 3).reduce((s, t) => s + t.amount, 0);
    if (total / cur.total >= RULES.largestMinShare) out.push({ kind: "largest_share", total, expensesTotal: cur.total, share: total / cur.total });
  }

  // 6. Necessities against optional purchases, among purchases that were given a spending type
  const typed = (t: string) => i.spendingTypes.find((x) => x.type === t)?.total ?? 0;
  const necessity = typed("necessity");
  const optional = OPTIONAL_TYPES.reduce((s, t) => s + typed(t), 0);
  const classifiedShare = (necessity + optional) / cur.total;
  if (necessity > 0 && optional > 0 && classifiedShare >= RULES.typesMinClassified) {
    out.push({ kind: "spending_types", necessity, optional, impulse: typed("impulse"), classifiedShare });
  }

  // 7. The area with the most spending, and how many purchases it took
  const top = i.current.categories.find((c) => c.categoryId !== null);
  if (top && top.categoryId && top.count >= RULES.categoryMinCount) {
    out.push({ kind: "category_count", categoryId: top.categoryId, name: top.name, count: top.count, total: top.total });
  }

  return out;
}

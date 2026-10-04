import { api } from "../../lib/api";

export type SubRow = { categoryId: string; name: string; total: number; count: number };
export type AreaRow = { categoryId: string | null; name: string; total: number; count: number; children: SubRow[] };
export type Summary = {
  period: { from: string; to: string; month?: string };
  currentMonth: string;
  income: { total: number; count: number };
  expenses: { total: number; count: number };
  net: number;
  transactionCount: number;
  largestExpenses: { id: string; description: string; amount: number; date: string; categoryId?: string }[];
  categories: AreaRow[];
  topCategory: AreaRow | null;
};

export const getSummary = (month?: string) => api<Summary>(`/analytics/summary${month ? `?month=${month}` : ""}`);

// ---- Analyze ----
export type MonthRange = { from: string; to: string };
export type MonthRow = { month: string; income: number; expenses: number; net: number; count: number };
export type Monthly = { range: MonthRange; currentMonth: string; firstMonth: string | null; months: MonthRow[] };
export type Breakdown = {
  range: MonthRange;
  transactionCount: number;
  income: { total: number; count: number };
  expenses: { total: number; count: number };
  net: number;
  categories: AreaRow[];
  spendingTypes: { type: string | null; total: number; count: number }[];
  merchants: { name: string; total: number; count: number }[];
  largestExpenses: Summary["largestExpenses"];
};
export type Trend = { category: { id: string; name: string; kind: string }; range: MonthRange; months: { month: string; total: number; count: number }[] };

const qs = (r?: MonthRange, extra: Record<string, string> = {}) => {
  const p = new URLSearchParams(extra);
  if (r) {
    p.set("from", r.from);
    p.set("to", r.to);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
};
export const getMonthly = (r?: MonthRange) => api<Monthly>(`/analytics/monthly${qs(r)}`);
export const getBreakdown = (r?: MonthRange) => api<Breakdown>(`/analytics/breakdown${qs(r)}`);
export const getCategoryTrend = (categoryId: string, r?: MonthRange) => api<Trend>(`/analytics/category-trend${qs(r, { categoryId })}`);

// ---- Compare ----
export type Side = { total: number; count: number };
export type Delta = { a: Side; b: Side; change: number; changePct: number | null };
export type CompareSub = Delta & { categoryId: string; name: string };
export type CompareRow = Delta & { categoryId: string | null; name: string; children: CompareSub[] };
export type PeriodInfo = { from: string; to: string; month?: string; transactionCount: number };
export type Comparison = {
  a: PeriodInfo;
  b: PeriodInfo;
  currentMonth: string;
  firstMonth: string | null;
  income: Delta;
  expenses: Delta;
  net: { a: number; b: number; change: number };
  categories: CompareRow[];
};
/** A period is a month ("2026-07") or a range of days. */
export type PeriodSel = { month: string } | { from: string; to: string };

export function getComparison(a?: PeriodSel, b?: PeriodSel) {
  const p = new URLSearchParams();
  const put = (prefix: "a" | "b", sel?: PeriodSel) => {
    if (!sel) return;
    if ("month" in sel) p.set(prefix, sel.month);
    else {
      p.set(`${prefix}From`, sel.from);
      p.set(`${prefix}To`, sel.to);
    }
  };
  put("a", a);
  put("b", b);
  const s = p.toString();
  return api<Comparison>(`/analytics/comparison${s ? `?${s}` : ""}`);
}

// ---- Observations ----
export type ComparedWith = { from: string; to: string; partial: boolean; month?: string };
export type Observation =
  | { kind: "spending_change"; current: number; previous: number; change: number; changePct: number; comparedWith: ComparedWith }
  | { kind: "unusual_high"; total: number; average: number; ratio: number; months: number }
  | { kind: "highest_month"; month: string; total: number; year: string; monthsWithData: number }
  | { kind: "category_increase"; categoryId: string; name: string; current: number; previous: number; change: number; changePct: number | null; comparedWith: ComparedWith }
  | { kind: "largest_share"; total: number; expensesTotal: number; share: number }
  | { kind: "spending_types"; necessity: number; optional: number; impulse: number; classifiedShare: number }
  | { kind: "category_count"; categoryId: string; name: string; count: number; total: number }
  | { kind: "plan_spending"; expected: number; actual: number; usedShare: number; isCurrent: boolean; elapsedShare: number }
  | { kind: "plan_category"; categoryId: string; name: string; expected: number; actual: number; usedShare: number };
export type Observations = { month: string; currentMonth: string; expenseCount: number; comparedWith: ComparedWith; observations: Observation[] };

export const getObservations = (month?: string) => api<Observations>(`/analytics/observations${month ? `?month=${month}` : ""}`);

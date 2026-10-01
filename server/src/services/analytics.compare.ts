export type Side = { total: number; count: number };
export type Delta = { a: Side; b: Side; change: number; changePct: number | null };
export type SubDelta = Delta & { categoryId: string; name: string };
export type CategoryDelta = Delta & { categoryId: string | null; name: string; children: SubDelta[] };

type SummaryLike = {
  period: { from: string; to: string; month?: string };
  transactionCount: number;
  income: Side;
  expenses: Side;
  categories: { categoryId: string | null; name: string; total: number; count: number; children: { categoryId: string; name: string; total: number; count: number }[] }[];
};

const ZERO: Side = { total: 0, count: 0 };

/** b minus a. The percentage is relative to a, so it is null when a is zero (there is nothing to be relative to). */
export function delta(a: Side, b: Side): Delta {
  const change = b.total - a.total;
  return { a, b, change, changePct: a.total > 0 ? change / a.total : null };
}

// Biggest movement first, whichever direction; ties fall back to the larger category, then the name.
const byMovement = (x: { name: string; change: number; a: Side; b: Side }, y: typeof x) =>
  Math.abs(y.change) - Math.abs(x.change) ||
  Math.max(y.a.total, y.b.total) - Math.max(x.a.total, x.b.total) ||
  x.name.localeCompare(y.name);

type Acc = { categoryId: string | null; name: string; a: Side; b: Side; kids: Map<string, { categoryId: string; name: string; a: Side; b: Side }> };

/** Lines two periods' category roll-ups up side by side, keeping categories that only appear in one of them. */
export function mergeCategories(aRows: SummaryLike["categories"], bRows: SummaryLike["categories"]): CategoryDelta[] {
  const map = new Map<string, Acc>();
  const take = (rows: SummaryLike["categories"], which: "a" | "b") => {
    for (const r of rows) {
      const key = r.categoryId ?? "none";
      const acc = map.get(key) ?? { categoryId: r.categoryId, name: r.name, a: ZERO, b: ZERO, kids: new Map() };
      acc[which] = { total: r.total, count: r.count };
      acc.name = r.name;
      for (const c of r.children) {
        const kid = acc.kids.get(c.categoryId) ?? { categoryId: c.categoryId, name: c.name, a: ZERO, b: ZERO };
        kid[which] = { total: c.total, count: c.count };
        acc.kids.set(c.categoryId, kid);
      }
      map.set(key, acc);
    }
  };
  take(aRows, "a");
  take(bRows, "b");

  return [...map.values()]
    .map((acc) => ({
      categoryId: acc.categoryId,
      name: acc.name,
      ...delta(acc.a, acc.b),
      children: [...acc.kids.values()].map((k) => ({ ...k, ...delta(k.a, k.b) })).sort(byMovement),
    }))
    .sort(byMovement);
}

/** Period b compared with period a: totals, net, and every category that appears in either. */
export function buildComparison(a: SummaryLike, b: SummaryLike) {
  const net = (s: SummaryLike) => s.income.total - s.expenses.total;
  return {
    a: { ...a.period, transactionCount: a.transactionCount },
    b: { ...b.period, transactionCount: b.transactionCount },
    income: delta(a.income, b.income),
    expenses: delta(a.expenses, b.expenses),
    net: { a: net(a), b: net(b), change: net(b) - net(a) },
    categories: mergeCategories(a.categories, b.categories),
  };
}

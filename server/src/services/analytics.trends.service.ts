import { Types } from "mongoose";
import { Category } from "../models/Category";
import { Plan } from "../models/Plan";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { ComparisonQuery, MonthsQuery, ObservationsQuery, TrendQuery } from "../schemas/analytics.schema";
import { HttpError } from "../utils/httpError";
import { buildComparison } from "./analytics.compare";
import { buildObservations } from "./analytics.observations";
import { fillMonths, lastDayOf, monthBounds, monthsBetween, resolveMonthRange, resolveRange, shiftMonth, todayIn } from "./analytics.range";
import { getSummary } from "./analytics.service";
import { rollupByCategory } from "./analytics.rollup";
import { categoryActual, monthProgress } from "./plan.logic";

async function rangeFor(userId: string, q: MonthsQuery) {
  const user = await User.findById(userId).select("timezone");
  const range = resolveMonthRange(q, user?.timezone ?? "Africa/Algiers");
  return { ...range, ...monthBounds(range.from, range.to), months: monthsBetween(range.from, range.to) };
}

// Stored dates are noon UTC of their calendar day, so grouping by the UTC year-month is exact.
const monthOf = { $dateToString: { format: "%Y-%m", date: "$date" } };

/** Income and spending per month, zero-filled. Also reports the earliest month with data. */
export async function getMonthly(userId: string, q: MonthsQuery) {
  const r = await rangeFor(userId, q);
  const oid = new Types.ObjectId(userId);
  const [rows, first] = await Promise.all([
    Transaction.aggregate<{ _id: { month: string; type: "income" | "expense" }; total: number; count: number }>([
      { $match: { userId: oid, date: { $gte: r.start, $lte: r.end } } },
      { $group: { _id: { month: monthOf, type: "$type" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Transaction.findOne({ userId: oid }).sort({ date: 1 }).select("date"),
  ]);

  const byMonth = new Map<string, { income: number; expenses: number; net: number; count: number }>();
  for (const row of rows) {
    const m = byMonth.get(row._id.month) ?? { income: 0, expenses: 0, net: 0, count: 0 };
    if (row._id.type === "income") m.income += row.total;
    else m.expenses += row.total;
    m.count += row.count;
    m.net = m.income - m.expenses;
    byMonth.set(row._id.month, m);
  }
  return {
    range: { from: r.from, to: r.to },
    currentMonth: r.currentMonth,
    firstMonth: first ? first.date.toISOString().slice(0, 7) : null,
    months: fillMonths(r.months, byMonth, { income: 0, expenses: 0, net: 0, count: 0 }),
  };
}

type Total = { _id: "income" | "expense"; total: number; count: number };
type Breakdown = {
  totals: Total[];
  types: { _id: string | null; total: number; count: number }[];
  merchants: { _id: string; name: string; total: number; count: number }[];
  categories: { _id: Types.ObjectId | null; total: number; count: number }[];
  largest: { _id: Types.ObjectId; description: string; amount: number; date: Date; categoryId?: Types.ObjectId }[];
};

/** Everything Analyze shows for a period, except the per-month series. One aggregation, computed in the database. */
export async function getBreakdown(userId: string, q: MonthsQuery) {
  const r = await rangeFor(userId, q);
  const expense = { $match: { type: "expense" } };
  const [[agg], cats] = await Promise.all([
    Transaction.aggregate<Breakdown>([
      { $match: { userId: new Types.ObjectId(userId), date: { $gte: r.start, $lte: r.end } } },
      {
        $facet: {
          totals: [{ $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } }],
          types: [expense, { $group: { _id: { $ifNull: ["$spendingType", null] }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }],
          merchants: [
            { $match: { type: "expense", merchant: { $exists: true, $ne: "" } } },
            { $sort: { date: -1 } }, // so $first below is the most recent spelling
            { $group: { _id: { $toLower: "$merchant" }, name: { $first: "$merchant" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
            { $sort: { total: -1, _id: 1 } },
            { $limit: 10 },
          ],
          categories: [expense, { $group: { _id: "$categoryId", total: { $sum: "$amount" }, count: { $sum: 1 } } }],
          largest: [expense, { $sort: { amount: -1, _id: -1 } }, { $limit: 5 }, { $project: { description: 1, amount: 1, date: 1, categoryId: 1 } }],
        },
      },
    ]),
    Category.find({ userId }).select("name parentId").lean(),
  ]);

  const pick = (t: Total["_id"]) => agg.totals.find((x) => x._id === t) ?? { total: 0, count: 0 };
  const income = pick("income");
  const expenses = pick("expense");
  return {
    range: { from: r.from, to: r.to },
    transactionCount: income.count + expenses.count,
    income: { total: income.total, count: income.count },
    expenses: { total: expenses.total, count: expenses.count },
    net: income.total - expenses.total,
    categories: rollupByCategory(
      agg.categories.map((c) => ({ _id: c._id ? String(c._id) : null, total: c.total, count: c.count })),
      cats.map((c) => ({ id: String(c._id), name: c.name, parentId: c.parentId ? String(c.parentId) : undefined })),
    ),
    spendingTypes: agg.types.map((t) => ({ type: t._id, total: t.total, count: t.count })),
    merchants: agg.merchants.map((m) => ({ name: m.name, total: m.total, count: m.count })),
    largestExpenses: agg.largest.map((t) => ({
      id: String(t._id),
      description: t.description,
      amount: t.amount,
      date: t.date,
      categoryId: t.categoryId ? String(t.categoryId) : undefined,
    })),
  };
}

/** One category's monthly total (its sub-categories included), zero-filled. */
export async function getCategoryTrend(userId: string, q: TrendQuery) {
  const cat = await Category.findOne({ _id: q.categoryId, userId });
  if (!cat) throw new HttpError(404, "That category wasn't found.");
  const r = await rangeFor(userId, q);
  const ids = [cat._id, ...(await Category.find({ userId, parentId: cat._id }).distinct("_id"))];
  const rows = await Transaction.aggregate<{ _id: string; total: number; count: number }>([
    { $match: { userId: new Types.ObjectId(userId), type: cat.kind, categoryId: { $in: ids }, date: { $gte: r.start, $lte: r.end } } },
    { $group: { _id: monthOf, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  const byMonth = new Map(rows.map((x) => [x._id, { total: x.total, count: x.count }]));
  return {
    category: { id: String(cat._id), name: cat.name, kind: cat.kind },
    range: { from: r.from, to: r.to },
    months: fillMonths(r.months, byMonth, { total: 0, count: 0 }),
  };
}

// ---- Compare ----

/** Period b compared with period a. With no periods given: last month vs this month, in the user's timezone. */
export async function getComparison(userId: string, q: ComparisonQuery) {
  const user = await User.findById(userId).select("timezone");
  const { currentMonth } = resolveRange({}, user?.timezone ?? "Africa/Algiers");
  const a = q.a ?? { month: shiftMonth(currentMonth, -1) };
  const b = q.b ?? { month: currentMonth };
  const [sa, sb, first] = await Promise.all([
    getSummary(userId, a),
    getSummary(userId, b),
    Transaction.findOne({ userId: new Types.ObjectId(userId) }).sort({ date: 1 }).select("date"),
  ]);
  return { ...buildComparison(sa, sb), currentMonth, firstMonth: first ? first.date.toISOString().slice(0, 7) : null };
}

// ---- Observations ----

/**
 * Rule-based "things worth noticing" for a month. While the month is still running it is compared with the
 * same days of last month, so a half-finished month is never set against a finished one.
 */
export async function getObservations(userId: string, q: ObservationsQuery) {
  const user = await User.findById(userId).select("timezone");
  const tz = user?.timezone ?? "Africa/Algiers";
  const range = resolveRange({ month: q.month }, tz);
  const currentMonth = range.currentMonth;
  const month = range.month ?? currentMonth;
  const isCurrent = month === currentMonth;

  const prevMonth = shiftMonth(month, -1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dayOfMonth = Number(todayIn(tz).slice(8, 10));
  const comparedWith = isCurrent
    ? { from: `${prevMonth}-01`, to: `${prevMonth}-${pad(Math.min(dayOfMonth, lastDayOf(prevMonth)))}`, partial: true }
    : { from: `${prevMonth}-01`, to: `${prevMonth}-${pad(lastDayOf(prevMonth))}`, partial: false, month: prevMonth };

  const yearStart = `${month.slice(0, 4)}-01`;
  const trailingStart = shiftMonth(month, -6);
  const seriesFrom = yearStart < trailingStart ? yearStart : trailingStart;

  const [cur, prev, breakdown, series, plan, cats] = await Promise.all([
    getSummary(userId, { month }),
    getSummary(userId, { from: comparedWith.from, to: comparedWith.to }),
    getBreakdown(userId, { from: month, to: month }),
    getMonthly(userId, { from: seriesFrom, to: month }),
    Plan.findOne({ userId, month }).lean(),
    Category.find({ userId }).select("name").lean(),
  ]);
  const names = new Map(cats.map((c) => [String(c._id), c.name]));

  return {
    month,
    currentMonth,
    expenseCount: cur.expenses.count,
    comparedWith,
    observations: buildObservations({
      month,
      comparedWith,
      current: { expenses: cur.expenses, largest: cur.largestExpenses, categories: cur.categories },
      previous: { expenses: prev.expenses, categories: prev.categories },
      spendingTypes: breakdown.spendingTypes,
      months: series.months.map((m) => ({ month: m.month, expenses: m.expenses })),
      monthState: monthProgress(month, todayIn(tz)),
      plan: plan
        ? {
            expectedSpending: plan.expectedSpending,
            categories: (plan.categories ?? []).map((c) => ({
              categoryId: String(c.categoryId), name: names.get(String(c.categoryId)) ?? "Unknown category",
              expected: c.amount, actual: categoryActual(cur.categories, String(c.categoryId)).total,
            })),
          }
        : null,
    }),
  };
}

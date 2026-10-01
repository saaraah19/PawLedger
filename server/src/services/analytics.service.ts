import { Types } from "mongoose";
import { Category } from "../models/Category";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { SummaryQuery } from "../schemas/analytics.schema";
import { rangeBounds, resolveRange } from "./analytics.range";
import { rollupByCategory } from "./analytics.rollup";

type Total = { _id: "income" | "expense"; total: number; count: number };
type Agg = {
  totals: Total[];
  largest: { _id: Types.ObjectId; description: string; amount: number; date: Date; categoryId?: Types.ObjectId }[];
  byCategory: { _id: Types.ObjectId | null; total: number; count: number }[];
};

/** Everything the dashboard needs for one period, computed in the database. Amounts are integer minor units. */
export async function getSummary(userId: string, q: SummaryQuery) {
  const user = await User.findById(userId).select("timezone");
  const range = resolveRange(q, user?.timezone ?? "Africa/Algiers");
  const { start, end } = rangeBounds(range.from, range.to);

  const [[agg], cats] = await Promise.all([
    Transaction.aggregate<Agg>([
      { $match: { userId: new Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
      {
        $facet: {
          totals: [{ $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } }],
          largest: [
            { $match: { type: "expense" } },
            { $sort: { amount: -1, _id: -1 } },
            { $limit: 3 },
            { $project: { description: 1, amount: 1, date: 1, categoryId: 1 } },
          ],
          byCategory: [
            { $match: { type: "expense" } },
            { $group: { _id: "$categoryId", total: { $sum: "$amount" }, count: { $sum: 1 } } },
          ],
        },
      },
    ]),
    Category.find({ userId }).select("name parentId").lean(),
  ]);

  const pick = (type: Total["_id"]) => agg.totals.find((t) => t._id === type) ?? { total: 0, count: 0 };
  const income = pick("income");
  const expenses = pick("expense");
  const categories = rollupByCategory(
    agg.byCategory.map((r) => ({ _id: r._id ? String(r._id) : null, total: r.total, count: r.count })),
    cats.map((c) => ({ id: String(c._id), name: c.name, parentId: c.parentId ? String(c.parentId) : undefined })),
  );

  return {
    period: { from: range.from, to: range.to, month: range.month },
    currentMonth: range.currentMonth,
    income: { total: income.total, count: income.count },
    expenses: { total: expenses.total, count: expenses.count },
    net: income.total - expenses.total,
    transactionCount: income.count + expenses.count,
    largestExpenses: agg.largest.map((t) => ({
      id: String(t._id),
      description: t.description,
      amount: t.amount,
      date: t.date,
      categoryId: t.categoryId ? String(t.categoryId) : undefined,
    })),
    categories,
    // "Most-used spending area" = the categorised area with the highest total spend.
    topCategory: categories.find((c) => c.categoryId !== null) ?? null,
  };
}

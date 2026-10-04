import { Category } from "../models/Category";
import { Plan } from "../models/Plan";
import { User } from "../models/User";
import { PlanInput } from "../schemas/planning.schema";
import { HttpError } from "../utils/httpError";
import { shiftMonth, todayIn } from "./analytics.range";
import { getSummary } from "./analytics.service";
import { getMonthly } from "./analytics.trends.service";
import { computeOverview } from "./inventory.service";
import { monthProgress, planReview } from "./plan.logic";

/** For each of the last twelve months that had a plan: what was expected, and what was spent. */
async function planHistory(userId: string, currentMonth: string) {
  const from = shiftMonth(currentMonth, -11);
  const plans = await Plan.find({ userId, month: { $gte: from, $lte: currentMonth } }).sort({ month: 1 }).lean();
  if (plans.length === 0) return [];
  const spent = new Map((await getMonthly(userId, { from, to: currentMonth })).months.map((m) => [m.month, m.expenses]));
  return plans.map((p) => {
    const actual = spent.get(p.month) ?? 0;
    return { month: p.month, expected: p.expectedSpending, actual, usedShare: actual / p.expectedSpending };
  });
}

/** One month's plan, set against what happened (with the month's progress, so a running month isn't judged as finished). */
export async function getPlanView(userId: string, monthInput?: string) {
  const user = await User.findById(userId).select("timezone");
  const today = todayIn(user?.timezone ?? "Africa/Algiers");
  const currentMonth = today.slice(0, 7);
  const month = monthInput ?? currentMonth;

  const [plan, previousPlan, summary, cats, overview, history] = await Promise.all([
    Plan.findOne({ userId, month }),
    Plan.findOne({ userId, month: shiftMonth(month, -1) }),
    getSummary(userId, { month }),
    Category.find({ userId }).select("name").lean(),
    computeOverview(userId, today),
    planHistory(userId, currentMonth),
  ]);
  const names = new Map(cats.map((c) => [String(c._id), c.name]));
  // Saved this month = the change in savings between the inventory that opens it and the one that opens the next.
  const period = overview.periods.find((p) => p.fromMonth === month && p.toMonth === shiftMonth(month, 1));
  const savedActual = period ? period.savingsChange : null;

  return {
    month,
    currentMonth,
    state: monthProgress(month, today),
    plan: plan ? plan.toJSON() : null,
    previousPlan: previousPlan ? previousPlan.toJSON() : null,
    actual: { expenses: summary.expenses, income: summary.income },
    savedActual,
    review: plan
      ? planReview(
          { expectedSpending: plan.expectedSpending, expectedIncome: plan.expectedIncome, expectedSaving: plan.expectedSaving, categories: (plan.categories ?? []).map((c) => ({ categoryId: String(c.categoryId), amount: c.amount })) },
          { expenses: summary.expenses, income: summary.income, categories: summary.categories },
          names,
          savedActual,
        )
      : null,
    history,
  };
}

/** Sets (or replaces) the plan for a month. */
export async function upsertPlan(userId: string, month: string, data: PlanInput) {
  const lines = data.categories ?? [];
  if (lines.length > 0) {
    const found = await Category.find({ userId, _id: { $in: lines.map((l) => l.categoryId) } }).select("name kind parentId").lean();
    if (found.length !== lines.length) throw new HttpError(400, "One of those categories doesn't exist.");
    const income = found.find((c) => c.kind !== "expense");
    if (income) throw new HttpError(400, `${income.name} is an income category; expectations here are for spending.`);
    const ids = new Set(found.map((c) => String(c._id)));
    const nested = found.find((c) => c.parentId && ids.has(String(c.parentId)));
    if (nested) throw new HttpError(400, `Choose either the whole category or just ${nested.name}, not both: the whole category already includes it.`);
  }

  const set: Record<string, unknown> = { expectedSpending: data.expectedSpending };
  const unset: Record<string, 1> = { demo: 1 }; // saving a plan makes it the user's own
  for (const key of ["expectedIncome", "expectedSaving", "notes"] as const) {
    if (data[key] !== undefined) set[key] = data[key];
    else unset[key] = 1;
  }
  if (lines.length > 0) set.categories = lines;
  else unset.categories = 1;

  return Plan.findOneAndUpdate({ userId, month }, { $set: set, $unset: unset }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

export async function deletePlan(userId: string, month: string) {
  const r = await Plan.deleteOne({ userId, month });
  if (r.deletedCount === 0) throw new HttpError(404, "There is no plan for that month.");
}

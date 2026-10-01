import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { AreaRow, Breakdown, getBreakdown, getCategoryTrend, getMonthly, Monthly, Trend } from "../features/analytics/api";
import { CategoryTrendChart, IncomeSpendingChart } from "../features/analytics/Charts";
import { periodOptions } from "../features/analytics/months";
import { SpendingByArea } from "../features/analytics/SpendingByArea";
import { useCategories } from "../features/categories/CategoriesContext";
import { categoryLabel, categoryOptions } from "../features/categories/tree";
import { formatDay, SPENDING_TYPES } from "../features/transactions/api";
import { useTransactionUi } from "../features/transactions/TransactionUi";
import { ApiError } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import { formatMoney, formatNet } from "../lib/money";

const spendingLabel = Object.fromEntries(SPENDING_TYPES) as Record<string, string>;
const h2 = "font-display text-xl font-bold tracking-tight";

export function Analyze() {
  useTitle("Analyze");
  const { user } = useAuth();
  const { version } = useTransactionUi();
  const { categories } = useCategories();
  const currency = user?.currency ?? "DZD";

  const [periodKey, setPeriodKey] = useState("last12");
  const [monthly, setMonthly] = useState<Monthly | null>(null);
  const [b, setB] = useState<Breakdown | null>(null);
  const [trendCat, setTrendCat] = useState("");
  const [trend, setTrend] = useState<Trend | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  // The picker's choices come from the server's view of your data (first month, current month).
  const options = useMemo(() => periodOptions(monthly?.firstMonth ?? null, monthly?.currentMonth ?? ""), [monthly?.firstMonth, monthly?.currentMonth]);
  const range = options.find((o) => o.key === periodKey)?.range; // undefined = server default (last 12 months)

  useEffect(() => {
    let live = true;
    setError("");
    Promise.all([getMonthly(range), getBreakdown(range)])
      .then(([m, br]) => {
        if (!live) return;
        setMonthly(m);
        setB(br);
        // Start the category trend on whichever category took the most spending.
        setTrendCat((cur) => cur || br.categories.find((c) => c.categoryId)?.categoryId || "");
      })
      .catch((e) => live && setError(e instanceof ApiError ? e.message : "We couldn't load your analysis."));
    return () => { live = false; };
  }, [range?.from, range?.to, version, retry]);

  useEffect(() => {
    if (!trendCat) return setTrend(null);
    let live = true;
    getCategoryTrend(trendCat, range).then((t) => live && setTrend(t)).catch(() => live && setTrend(null));
    return () => { live = false; };
  }, [trendCat, range?.from, range?.to, version]);

  const toRow = (id: string | null, name: string, x: { total: number; count: number }): AreaRow => ({ categoryId: id, name, total: x.total, count: x.count, children: [] });
  const typeRows = (b?.spendingTypes ?? []).map((t) => toRow(t.type, t.type ? spendingLabel[t.type] ?? t.type : "Not set", t));
  const merchantRows = (b?.merchants ?? []).map((m) => toRow(m.name, m.name, m));
  const trendOptions = categoryOptions(categories, { kind: "expense", keepId: trendCat });
  const empty = b !== null && b.transactionCount === 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Analyze</h1>
        <label className="text-sm text-stone">
          Period{" "}
          <select value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} className="rounded-sm border border-rule bg-transparent px-2 py-1 text-ink">
            {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-8 border-l-2 border-ochre pl-3 text-sm">
          {error} <button onClick={() => setRetry((n) => n + 1)} className="underline underline-offset-4">Try again</button>
        </p>
      )}
      {!b && !error && <p className="mt-8 text-stone">Reading your history…</p>}

      {empty && (
        <p className="mt-8 max-w-md leading-relaxed text-stone">
          There isn't enough history here yet. Keep recording normally; patterns become more useful over time.
        </p>
      )}

      {b && monthly && !empty && (
        <div className={`space-y-10 ${error ? "opacity-60" : ""}`}>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-rule py-4">
            <div><dt className="text-sm text-stone">Income</dt><dd className="mt-1 text-base font-semibold sm:text-lg text-moss">{formatMoney(b.income.total, currency)}</dd></div>
            <div><dt className="text-sm text-stone">Spent</dt><dd className="mt-1 text-base font-semibold sm:text-lg">{formatMoney(b.expenses.total, currency)}</dd></div>
            <div><dt className="text-sm text-stone">Net</dt><dd className="mt-1 text-base font-semibold sm:text-lg">{formatNet(b.net, currency)}</dd></div>
          </dl>

          <section>
            <h2 className={h2}>Income and spending by month</h2>
            <div className="mt-3"><IncomeSpendingChart months={monthly.months} currency={currency} /></div>
          </section>

          {b.categories.length > 0 && (
            <section>
              <h2 className={h2}>Where it went</h2>
              <div className="mt-3"><SpendingByArea rows={b.categories} total={b.expenses.total} currency={currency} /></div>
            </section>
          )}

          {typeRows.length > 0 && (
            <section>
              <h2 className={h2}>What kind of spending</h2>
              <p className="mt-1 text-sm text-stone">Necessity, good to have, complementary and impulse purchases, as you marked them.</p>
              <div className="mt-3"><SpendingByArea rows={typeRows} total={b.expenses.total} currency={currency} /></div>
            </section>
          )}

          {trendOptions.length > 0 && (
            <section>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className={h2}>One category over time</h2>
                <select aria-label="Category" value={trendCat} onChange={(e) => setTrendCat(e.target.value)} className="max-w-[60%] rounded-sm border border-rule bg-transparent px-2 py-1 text-sm">
                  {trendOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <p className="mt-1 text-sm text-stone">A parent category includes its sub-categories.</p>
              <div className="mt-3">
                {trend ? <CategoryTrendChart name={trend.category.name} months={trend.months} currency={currency} /> : <p className="text-sm text-stone">Loading…</p>}
              </div>
            </section>
          )}

          {merchantRows.length > 0 && (
            <section>
              <h2 className={h2}>Where you shop</h2>
              <p className="mt-1 text-sm text-stone">Top stores by amount. Expenses without a store aren't listed.</p>
              <div className="mt-3"><SpendingByArea rows={merchantRows} total={b.expenses.total} currency={currency} /></div>
            </section>
          )}

          {b.largestExpenses.length > 0 && (
            <section>
              <h2 className={h2}>Largest purchases</h2>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {b.largestExpenses.map((t) => (
                  <li key={t.id} className="flex items-baseline justify-between gap-4 py-3">
                    <span className="min-w-0">
                      <span className="font-medium">{t.description}</span>
                      <span className="ml-3 text-sm text-stone">{formatDay(t.date)}{t.categoryId ? `, ${categoryLabel(categories, t.categoryId)}` : ""}</span>
                    </span>
                    <span className="shrink-0">{formatMoney(t.amount, currency)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}

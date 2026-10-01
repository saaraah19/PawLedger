import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Paw } from "../components/Paw";
import { useAuth } from "../features/auth/AuthContext";
import { getObservations, getSummary, Observations, Summary } from "../features/analytics/api";
import { monthLabel, shiftMonth } from "../features/analytics/months";
import { describeObservation } from "../features/analytics/observations";
import { SpendingByArea } from "../features/analytics/SpendingByArea";
import { ExampleBanner } from "../features/onboarding/ExampleData";
import { useTitle } from "../lib/useTitle";
import { useCategories } from "../features/categories/CategoriesContext";
import { categoryLabel } from "../features/categories/tree";
import { formatDay, listTransactions, Page } from "../features/transactions/api";
import { useTransactionUi } from "../features/transactions/TransactionUi";
import { ApiError } from "../lib/api";
import { formatMoney, formatNet } from "../lib/money";

// Shown only before anything has ever been recorded.
function Trail() {
  return (
    <div className="mt-6 flex items-end gap-3 text-moss" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ opacity: 1 - i * 0.18, transform: `translateY(${i % 2 ? -8 : 0}px) rotate(${i % 2 ? 12 : -12}deg)` }}>
          <Paw className="h-6 w-6" />
        </span>
      ))}
    </div>
  );
}

export function Home() {
  useTitle();
  const { user } = useAuth();
  const { version } = useTransactionUi();
  const { categories } = useCategories();
  const currency = user?.currency ?? "DZD";

  const [month, setMonth] = useState<string | undefined>(); // undefined = current month (the server decides which)
  const [data, setData] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Page | null>(null);
  const [obs, setObs] = useState<Observations | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let live = true;
    setError("");
    getSummary(month)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e instanceof ApiError ? e.message : "We couldn't load this month."));
    return () => { live = false; };
  }, [month, version, retry]);

  useEffect(() => {
    // Observations are a bonus: if they fail to load, the dashboard simply doesn't show them.
    let live = true;
    getObservations(month).then((o) => live && setObs(o)).catch(() => live && setObs(null));
    return () => { live = false; };
  }, [month, version]);

  useEffect(() => {
    listTransactions({ page: 1, limit: 5, sort: "newest" }).then(setRecent).catch(() => setRecent(null));
  }, [version]);

  const shown = data?.period.month;
  const goto = (delta: number) => {
    if (!data || !shown) return;
    const next = shiftMonth(shown, delta);
    setMonth(next === data.currentMonth ? undefined : next);
  };
  const isCurrent = !!data && shown === data.currentMonth;
  const nothingEver = recent !== null && recent.total === 0;

  const navBtn = "rounded-sm border border-rule px-2.5 py-1 text-lg leading-none text-stone hover:text-ink disabled:opacity-40";

  return (
    <>
      <div className="flex items-center gap-3">
        <button className={navBtn} aria-label="Previous month" onClick={() => goto(-1)} disabled={!data}>‹</button>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{shown ? monthLabel(shown) : " "}</h1>
        <button className={navBtn} aria-label="Next month" onClick={() => goto(1)} disabled={!data || isCurrent}>›</button>
      </div>

      <ExampleBanner />

      {error && (
        <p role="alert" className="mt-8 border-l-2 border-ochre pl-3 text-sm">
          {error} <button onClick={() => setRetry((n) => n + 1)} className="underline underline-offset-4">Try again</button>
        </p>
      )}
      {!data && !error && <p className="mt-8 text-stone">Opening your ledger…</p>}

      {data && nothingEver && (
        <>
          <Trail />
          <p className="mt-10 max-w-md leading-relaxed text-stone">
            Nothing recorded yet. Your first transaction will become the first line in your financial history.
          </p>
        </>
      )}

      {data && !nothingEver && data.transactionCount === 0 && (
        <p className="mt-8 max-w-md leading-relaxed text-stone">
          Nothing recorded in {monthLabel(data.period.month ?? data.currentMonth)}. Earlier months are one step back with the arrow.
        </p>
      )}

      {data && data.transactionCount > 0 && (
        <div className={error ? "opacity-60" : ""}>
          <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-rule py-4">
            <div>
              <dt className="text-sm text-stone">Income</dt>
              <dd className="mt-1 text-base font-semibold sm:text-lg text-moss">{formatMoney(data.income.total, currency)}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone">Spent</dt>
              <dd className="mt-1 text-base font-semibold sm:text-lg">{formatMoney(data.expenses.total, currency)}</dd>
            </div>
            <div>
              <dt className="text-sm text-stone">Net</dt>
              <dd className="mt-1 text-base font-semibold sm:text-lg">{formatNet(data.net, currency)}</dd>
            </div>
          </dl>

          <p className="mt-4 leading-relaxed">
            {data.transactionCount} {data.transactionCount === 1 ? "transaction" : "transactions"}.
            {data.topCategory && (
              <> Most spent on {data.topCategory.name}: {formatMoney(data.topCategory.total, currency)} across {data.topCategory.count} {data.topCategory.count === 1 ? "purchase" : "purchases"}.</>
            )}
          </p>

          {obs && obs.month === shown && obs.observations.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-xl font-bold tracking-tight">Things worth noticing</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
                {obs.observations.map((o, i) => (
                  <li key={i}>{describeObservation(o, { currency, month: obs.month, isCurrent: obs.month === obs.currentMonth })}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-stone">Observations from what you have recorded, not advice.</p>
            </section>
          )}

          {data.categories.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-xl font-bold tracking-tight">Where it went</h2>
              <div className="mt-3">
                <SpendingByArea rows={data.categories} total={data.expenses.total} currency={currency} />
              </div>
            </section>
          )}

          {data.largestExpenses.length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-xl font-bold tracking-tight">Largest purchases</h2>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {data.largestExpenses.map((t) => (
                  <li key={t.id} className="flex items-baseline justify-between gap-4 py-3">
                    <span>
                      <span className="font-medium">{t.description}</span>
                      <span className="ml-3 text-sm text-stone">{formatDay(t.date)}</span>
                    </span>
                    <span className="shrink-0">{formatMoney(t.amount, currency)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {recent && recent.total > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold tracking-tight">Recent</h2>
            <Link to="/history" className="text-sm text-moss underline underline-offset-4">All history</Link>
          </div>
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {recent.items.map((t) => (
              <li key={t.id} className="flex items-baseline justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="font-medium">{t.description}</span>
                  <span className="ml-3 text-sm text-stone">
                    {formatDay(t.date)}{t.categoryId ? `, ${categoryLabel(categories, t.categoryId)}` : ""}
                  </span>
                </span>
                <span className={`shrink-0 ${t.type === "income" ? "text-moss" : ""}`}>
                  {t.type === "income" && "+"}{formatMoney(t.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Modal } from "../components/Modal";
import { useAuth } from "../features/auth/AuthContext";
import { monthLabel, shiftMonth } from "../features/analytics/months";
import { useCategories } from "../features/categories/CategoriesContext";
import { deletePlan, getPlanView, Plan as PlanData, PlanView } from "../features/planning/api";
import { PlanBar } from "../features/planning/PlanBar";
import { PlanForm } from "../features/planning/PlanForm";
import { useTransactionUi } from "../features/transactions/TransactionUi";
import { ApiError } from "../lib/api";
import { formatAmount, formatMoney, formatNet } from "../lib/money";
import { useTitle } from "../lib/useTitle";

const h2 = "font-display text-xl font-bold tracking-tight";

export function Plan() {
  useTitle("Plan");
  const { user } = useAuth();
  const { version, refresh } = useTransactionUi();
  const { categories } = useCategories();
  const currency = user?.currency ?? "DZD";
  const [params] = useSearchParams();

  const [month, setMonth] = useState<string | undefined>(params.get("month") ?? undefined);
  const [data, setData] = useState<PlanView | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState<{ initial?: PlanData } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setError("");
    getPlanView(month).then((d) => live && setData(d)).catch((e) => live && setError(e instanceof ApiError ? e.message : "We couldn't load this month's plan."));
    return () => { live = false; };
  }, [month, version, retry]);

  const shown = data?.month;
  const go = (delta: number) => {
    if (!data || !shown) return;
    const next = shiftMonth(shown, delta);
    setMonth(next === data.currentMonth ? undefined : next);
  };
  const running = data?.state.state === "current";
  const nav = "rounded-sm border border-rule px-2.5 py-1 text-lg leading-none text-stone hover:text-ink disabled:opacity-40";
  const r = data?.review;

  async function remove() {
    if (!shown || busy) return;
    setBusy(true);
    try {
      await deletePlan(shown);
      setConfirming(false);
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "We couldn't delete this plan. Nothing has been changed.");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Plan</h1>
      <div className="mt-4 flex items-center gap-3">
        <button className={nav} aria-label="Previous month" onClick={() => go(-1)} disabled={!data}>{"\u2039"}</button>
        <h2 className="font-display text-xl font-bold tracking-tight">{shown ? monthLabel(shown) : "\u00a0"}</h2>
        {/* one month ahead is allowed: expectations are often set before a month begins */}
        <button className={nav} aria-label="Next month" onClick={() => go(1)} disabled={!data || !shown || shown >= shiftMonth(data.currentMonth, 1)}>{"\u203a"}</button>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone">Set what you expect of a month, then watch how it goes. Expectations are for noticing, not for scoring.</p>

      {error && (
        <p role="alert" className="mt-8 border-l-2 border-ochre pl-3 text-sm">
          {error} <button onClick={() => setRetry((n) => n + 1)} className="underline underline-offset-4">Try again</button>
        </p>
      )}
      {!data && !error && <p className="mt-8 text-stone">Loading{"\u2026"}</p>}

      {data && !data.plan && (
        <section className="mt-8 max-w-xl">
          <p className="leading-relaxed">You haven't set expectations for {monthLabel(data.month)} yet. Say how much you expect to spend, and optionally how much on each category.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => setForm({})} className="rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white">Set expectations</button>
            {data.previousPlan && (
              <button onClick={() => setForm({ initial: data.previousPlan! })} className="rounded-sm border border-ink px-4 py-2 text-sm font-medium hover:bg-ink hover:text-paper">
                Start from {monthLabel(data.previousPlan.month)}'s
              </button>
            )}
          </div>
        </section>
      )}

      {data && data.plan && r && (
        <div className="mt-8 space-y-10">
          {data.state.state === "future" && <p className="text-sm text-stone">This month hasn't started, so nothing has been spent against these expectations yet.</p>}
          <section aria-labelledby="against">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="against" className={h2}>How it is going</h2>
              <div className="flex gap-4 text-sm">
                <button onClick={() => setForm({ initial: data.plan! })} className="py-1 text-moss underline underline-offset-4">Edit</button>
                <button onClick={() => setConfirming(true)} className="py-1 text-stone underline underline-offset-4 hover:text-ink">Delete</button>
              </div>
            </div>
            <div className="mt-4 space-y-5">
              <PlanBar label="Spending" expected={r.spending.expected} actual={r.spending.actual} currency={currency} elapsedShare={running ? data.state.elapsedShare : undefined} strong />
              {r.income && <PlanBar label="Income" expected={r.income.expected} actual={r.income.actual} currency={currency} />}
              {r.saving && (
                <div>
                  <p className="font-medium">Saving</p>
                  <p className="mt-0.5 text-sm text-stone">
                    {r.saving.actual === null
                      ? `You expected to put aside ${formatMoney(r.saving.expected, currency)}. The actual figure appears once you have counted the start of the next month.`
                      : `You expected to put aside ${formatMoney(r.saving.expected, currency)} and savings changed by ${formatNet(r.saving.actual, currency)} (${formatNet(r.saving.difference ?? 0, currency)} against what you expected).`}
                  </p>
                </div>
              )}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-stone">
              The dark line marks what you expected.{running ? " The grey tick marks how far through the month you are." : ""} A bar that passes the line turns dark; that is a fact, not a verdict.
            </p>
            {data.plan.notes && <p className="mt-3 text-sm italic text-stone">{data.plan.notes}</p>}
          </section>

          {r.categories.length > 0 && (
            <section aria-labelledby="bycat">
              <h2 id="bycat" className={h2}>By category</h2>
              <ul className="mt-4 space-y-5">
                {r.categories.map((c) => (
                  <li key={c.categoryId}><PlanBar label={c.name} expected={c.expected} actual={c.actual} currency={currency} /></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {data && data.history.length > 0 && (
        <section className="mt-12" aria-labelledby="hist">
          <h2 id="hist" className={h2}>Expected and spent, month by month</h2>
          <table className="mt-3 w-full text-sm">
            <caption className="sr-only">For each month with a plan: what you expected to spend, and what you spent</caption>
            <thead>
              <tr className="border-y border-rule text-stone">
                <th scope="col" className="py-2 pr-2 text-left font-normal">Month</th>
                <th scope="col" className="py-2 pl-2 text-right font-normal">Expected</th>
                <th scope="col" className="py-2 pl-2 text-right font-normal">Spent</th>
                <th scope="col" className="py-2 pl-2 text-right font-normal">Used</th>
              </tr>
            </thead>
            <tbody>
              {[...data.history].reverse().map((h) => (
                <tr key={h.month} className="border-b border-rule last:border-0">
                  <th scope="row" className="py-2.5 pr-2 text-left font-medium">{monthLabel(h.month)}</th>
                  <td className="py-2.5 pl-2 text-right">{formatAmount(h.expected)}</td>
                  <td className="py-2.5 pl-2 text-right">{formatAmount(h.actual)}</td>
                  <td className="py-2.5 pl-2 text-right">{Math.round(h.usedShare * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-stone">Amounts in {currency}. The current month is still running.</p>
        </section>
      )}

      {form && data && (
        <Modal title={`Expectations for ${monthLabel(data.month)}`} onClose={() => setForm(null)}>
          <PlanForm month={data.month} initial={form.initial} categories={categories} currency={currency} onCancel={() => setForm(null)} onSaved={() => { setForm(null); refresh(); }} />
        </Modal>
      )}
      {confirming && data && (
        <Modal title="Delete these expectations?" onClose={() => setConfirming(false)}>
          <p className="text-sm leading-relaxed">This removes the expectations for {monthLabel(data.month)}. Your entries are not touched.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setConfirming(false)} className="px-3 py-2 text-sm text-stone hover:text-ink">Keep them</button>
            <button onClick={remove} disabled={busy} className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-60">{busy ? "Deleting\u2026" : "Delete"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

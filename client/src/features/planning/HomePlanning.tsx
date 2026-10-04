import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { monthLabel } from "../analytics/months";
import { useTransactionUi } from "../transactions/TransactionUi";
import { getInventoryPrompt, getPlanView, PlanView, Prompt } from "./api";
import { PlanBar } from "./PlanBar";
import { promptText } from "./wording";

const key = (month: string) => `pawledger:inventory-prompt-dismissed:${month}`;
const wasDismissed = (month: string) => { try { return localStorage.getItem(key(month)) === "1"; } catch { return false; } };

/** A gentle note on Home, only near the end or start of a month and only until the inventory is taken. */
export function InventoryPromptBanner() {
  const { version } = useTransactionUi();
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    getInventoryPrompt().then((r) => { setPrompt(r.prompt); setHidden(r.prompt ? wasDismissed(r.prompt.month) : false); }).catch(() => setPrompt(null));
  }, [version]);

  if (!prompt || hidden) return null;
  return (
    <div className="mt-6 border-l-2 border-ochre bg-white/40 py-3 pl-4 pr-3 text-sm" role="note">
      <p className="leading-relaxed">{promptText(prompt)}</p>
      <div className="mt-2 flex gap-4">
        <Link to="/inventory?new=1" className="py-1 text-moss underline underline-offset-4">Take inventory</Link>
        <button onClick={() => { try { localStorage.setItem(key(prompt.month), "1"); } catch { /* the note simply comes back next visit */ } setHidden(true); }} className="py-1 text-stone underline underline-offset-4 hover:text-ink">Not now</button>
      </div>
    </div>
  );
}

/** The month's spending against what was expected of it, or a nudge to set expectations early in the month. */
export function PlanSummary({ month, currency }: { month?: string; currency: string }) {
  const { version } = useTransactionUi();
  const [view, setView] = useState<PlanView | null>(null);

  useEffect(() => {
    let live = true;
    getPlanView(month).then((v) => live && setView(v)).catch(() => live && setView(null)); // a bonus: the dashboard works without it
    return () => { live = false; };
  }, [month, version]);

  if (!view) return null;
  const running = view.state.state === "current";
  if (view.plan && view.review) {
    return (
      <section className="mt-8" aria-labelledby="plan-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="plan-heading" className="font-display text-xl font-bold tracking-tight">Against what you expected</h2>
          <Link to={`/plan?month=${view.month}`} className="text-sm text-moss underline underline-offset-4">Plan details</Link>
        </div>
        <div className="mt-3">
          <PlanBar label="Spending" expected={view.review.spending.expected} actual={view.review.spending.actual} currency={currency} elapsedShare={running ? view.state.elapsedShare : undefined} strong />
        </div>
      </section>
    );
  }
  if (running && view.state.day <= 10) {
    return (
      <p className="mt-6 text-sm leading-relaxed text-stone">
        You haven't set expectations for {monthLabel(view.month)}.{" "}
        <Link to={`/plan?month=${view.month}`} className="text-moss underline underline-offset-4">Set them now</Link>
      </p>
    );
  }
  return null;
}

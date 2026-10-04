import { FormEvent, useState } from "react";
import { ApiError } from "../../lib/api";
import { formatMoney, minorToInput, parseAmount } from "../../lib/money";
import { Category } from "../categories/api";
import { categoryOptions } from "../categories/tree";
import { Plan, PlanBody, savePlan } from "./api";

const input = "mt-1 w-full rounded-sm border border-rule bg-white/60 px-3 py-2 outline-none focus:border-moss";
type Line = { categoryId: string; amount: string };

export function PlanForm({ month, initial, categories, currency, onSaved, onCancel }: {
  month: string; initial?: Plan; categories: Category[]; currency: string; onSaved: () => void; onCancel: () => void;
}) {
  const [spending, setSpending] = useState(initial ? minorToInput(initial.expectedSpending) : "");
  const [income, setIncome] = useState(initial?.expectedIncome ? minorToInput(initial.expectedIncome) : "");
  const [saving, setSaving] = useState(initial?.expectedSaving ? minorToInput(initial.expectedSaving) : "");
  const [lines, setLines] = useState<Line[]>((initial?.categories ?? []).map((c) => ({ categoryId: c.categoryId, amount: minorToInput(c.amount) })));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const options = categoryOptions(categories, { kind: "expense" });
  const spendingMinor = parseAmount(spending);
  const linesTotal = lines.reduce((s, l) => s + (parseAmount(l.amount) ?? 0), 0);
  const setLine = (i: number, patch: Partial<Line>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (spendingMinor === null) return setError("Enter how much you expect to spend this month, for example 30000.");
    const optional = (raw: string, what: string) => {
      if (!raw.trim()) return undefined;
      const m = parseAmount(raw);
      if (m === null) throw new Error(`Enter ${what} as an amount, or leave it empty.`);
      return m;
    };
    let body: PlanBody;
    try {
      const filled = lines.filter((l) => l.categoryId || l.amount.trim());
      const cats = filled.map((l) => {
        const amount = parseAmount(l.amount);
        if (!l.categoryId || amount === null) throw new Error("Each category line needs a category and an amount.");
        return { categoryId: l.categoryId, amount };
      });
      const expectedIncome = optional(income, "your expected income");
      const expectedSaving = optional(saving, "how much you expect to save");
      body = {
        expectedSpending: spendingMinor,
        ...(expectedIncome !== undefined && { expectedIncome }),
        ...(expectedSaving !== undefined && { expectedSaving }),
        ...(cats.length > 0 && { categories: cats }),
        ...(notes.trim() && { notes: notes.trim() }),
      };
    } catch (err) {
      return setError((err as Error).message);
    }
    setBusy(true);
    setError("");
    try {
      await savePlan(month, body);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't save these expectations. Nothing has been changed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">
        How much do you expect to spend? ({currency})
        <input className={input} required autoFocus inputMode="decimal" value={spending} onChange={(e) => setSpending(e.target.value)} placeholder="30000" />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Expected spending by category, optional</legend>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
            <select aria-label={`Category ${i + 1}`} className={input.replace("mt-1 ", "")} value={l.categoryId} onChange={(e) => setLine(i, { categoryId: e.target.value })}>
              <option value="">Choose a category</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <input aria-label={`Amount for category ${i + 1}`} className={input.replace("mt-1 ", "")} inputMode="decimal" placeholder="Amount" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
            <button type="button" aria-label={`Remove category ${i + 1}`} onClick={() => setLines(lines.filter((_, k) => k !== i))} className="px-2 py-2 text-stone hover:text-ink">{"\u2715"}</button>
          </div>
        ))}
        <button type="button" onClick={() => setLines([...lines, { categoryId: "", amount: "" }])} className="py-1 text-sm text-moss underline underline-offset-4">
          + Add {lines.length ? "another category" : "a category"}
        </button>
        {options.length === 0 && <p className="text-xs text-stone">Create spending categories first (Categories) to plan by category.</p>}
        {spendingMinor !== null && linesTotal > spendingMinor && (
          <p className="text-xs text-stone">These add up to {formatMoney(linesTotal, currency)}, which is more than the {formatMoney(spendingMinor, currency)} you expect in total. That's allowed; it is just worth a look.</p>
        )}
      </fieldset>

      <details className="border-t border-rule pt-3" open={Boolean(initial?.expectedIncome || initial?.expectedSaving || initial?.notes)}>
        <summary className="cursor-pointer text-sm font-medium">Income, saving and notes</summary>
        <div className="mt-3 space-y-4">
          <label className="block text-sm font-medium">
            Expected income ({currency})
            <input className={input} inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            How much you expect to put aside ({currency})
            <input className={input} inputMode="decimal" value={saving} onChange={(e) => setSaving(e.target.value)} />
            <span className="mt-1 block text-xs font-normal text-stone">Compared later with the change in your savings accounts between two inventories.</span>
          </label>
          <label className="block text-sm font-medium">
            Notes
            <textarea className={input} rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
      </details>

      {error && <p role="alert" className="border-l-2 border-ochre pl-3 text-sm">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-stone hover:text-ink">Cancel</button>
        <button disabled={busy} className="rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving\u2026" : "Save expectations"}</button>
      </div>
    </form>
  );
}

import { FormEvent, useState } from "react";
import { ApiError } from "../../lib/api";
import { formatMoney, minorToInput, parseBalance } from "../../lib/money";
import { endOfLastMonth } from "../analytics/months";
import { Account, InventoryRow, kindLabel, saveInventory } from "./api";

const input = "mt-1 w-full rounded-sm border border-rule bg-white/60 px-3 py-2 outline-none focus:border-moss";

export function InventoryForm({ accounts, editing, last, today, currency, onSaved, onCancel }: {
  accounts: Account[]; editing?: InventoryRow; last?: InventoryRow; today: string; currency: string; onSaved: () => void; onCancel: () => void;
}) {
  // Active accounts, plus any archived account this inventory already counted.
  const counted = new Set(editing?.balances.map((b) => b.accountId));
  const list = accounts.filter((a) => !a.archived || counted.has(a.id));

  const [asOf, setAsOf] = useState(editing?.asOf ?? today);
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries((editing?.balances ?? []).map((b) => [b.accountId, minorToInput(b.amount)])),
  );
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const parsed = list.map((a) => parseBalance(amounts[a.id] ?? ""));
  const total = parsed.every((p) => p !== null) ? parsed.reduce<number>((s, p) => s + (p ?? 0), 0) : null;
  const lastBalance = (id: string) => last?.balances.find((b) => b.accountId === id)?.amount;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const missing = list.find((_, i) => parsed[i] === null);
    if (missing) return setError(`Enter what ${missing.name} holds (0 is fine, and a minus sign means an overdraft).`);
    setBusy(true);
    setError("");
    try {
      await saveInventory(editing?.id, {
        asOf,
        balances: list.map((a, i) => ({ accountId: a.id, amount: parsed[i] as number })),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't save this inventory. Nothing has been changed.");
      setBusy(false);
    }
  }

  if (list.length === 0) {
    return (
      <div>
        <p className="leading-relaxed">An inventory counts what you hold in each account, so add at least one account first.</p>
        <div className="mt-6 flex justify-end"><button onClick={onCancel} className="rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white">Close</button></div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium">Counted as of the end of</legend>
        <input aria-label="Date counted" className={input} type="date" required max={today} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        <div className="mt-2 flex gap-4 text-sm">
          <button type="button" onClick={() => setAsOf(endOfLastMonth(today))} className="py-1 text-moss underline underline-offset-4">End of last month</button>
          <button type="button" onClick={() => setAsOf(today)} className="py-1 text-moss underline underline-offset-4">Today</button>
        </div>
        <p className="mt-1 text-xs text-stone">Counting on the 1st to the 16th files it under the start of that month; from the 17th, under the start of the next.</p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">What each account holds ({currency})</legend>
        {list.map((a, i) => (
          <label key={a.id} className="block text-sm">
            {a.name}{a.name.toLowerCase() === kindLabel(a.kind).toLowerCase() ? "" : <span className="text-stone"> ({kindLabel(a.kind)})</span>}
            <input className={input} inputMode="decimal" required value={amounts[a.id] ?? ""} onChange={(e) => setAmounts({ ...amounts, [a.id]: e.target.value })}
              placeholder={lastBalance(a.id) !== undefined ? `last time: ${minorToInput(lastBalance(a.id)!)}` : "0"} aria-invalid={parsed[i] === null && (amounts[a.id] ?? "") !== ""} />
          </label>
        ))}
        <p className="flex justify-between border-t border-rule pt-2 text-sm">
          <span>Total</span>
          <span className="font-semibold">{total === null ? "\u2014" : formatMoney(total, currency)}</span>
        </p>
      </fieldset>

      <label className="block text-sm font-medium">
        Notes
        <textarea className={input} rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {error && <p role="alert" className="border-l-2 border-ochre pl-3 text-sm">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-stone hover:text-ink">Cancel</button>
        <button disabled={busy} className="rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving\u2026" : editing ? "Save changes" : "Save inventory"}</button>
      </div>
    </form>
  );
}

import { FormEvent, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useCategories } from "../categories/CategoriesContext";
import { categoryOptions } from "../categories/tree";
import { ApiError } from "../../lib/api";
import { formatMoney, minorToInput, parseAmount } from "../../lib/money";
import {
  createTransaction, dayInput, SPENDING_TYPES, SpendingType, todayIn, Transaction, TxPayload, TxType, updateTransaction,
} from "./api";

type ItemRow = { name: string; amount: string; quantity: string };

const input = "mt-1 w-full rounded-sm border border-rule bg-white/60 px-3 py-2 outline-none focus:border-moss";

export function TransactionForm({ type, editing, onSaved, onCancel }: {
  type: TxType; editing?: Transaction; onSaved: () => void; onCancel: () => void;
}) {
  const { user } = useAuth();
  const { categories } = useCategories();
  const currency = user?.currency ?? "DZD";
  const isExpense = type === "expense";

  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? minorToInput(editing.amount) : "");
  const [date, setDate] = useState(editing ? dayInput(editing.date) : todayIn(user?.timezone ?? "Africa/Algiers"));
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [merchant, setMerchant] = useState(editing?.merchant ?? "");
  const [spendingType, setSpendingType] = useState<SpendingType | "">(editing?.spendingType ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [items, setItems] = useState<ItemRow[]>(
    editing?.items?.map((i) => ({ name: i.name, amount: minorToInput(i.amount), quantity: i.quantity ? String(i.quantity) : "" })) ?? [],
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const catOptions = categoryOptions(categories, { kind: type, keepId: editing?.categoryId });
  const hasItems = items.length > 0;
  const itemMinors = items.map((i) => parseAmount(i.amount));
  const total = hasItems ? (itemMinors.every((m) => m !== null) ? itemMinors.reduce<number>((s, m) => s + (m ?? 0), 0) : null) : parseAmount(amount);

  const setItem = (idx: number, patch: Partial<ItemRow>) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (total === null) return setError(hasItems ? "Every item needs a valid amount." : "Enter the amount, for example 8500 or 8500.50.");
    if (hasItems && items.some((i) => !i.name.trim())) return setError("Name each item.");

    const payload: TxPayload = {
      type,
      amount: total,
      date,
      description: description.trim(),
      ...(categoryId && { categoryId }),
      ...(notes.trim() && { notes: notes.trim() }),
      ...(isExpense && merchant.trim() && { merchant: merchant.trim() }),
      ...(isExpense && spendingType && { spendingType }),
      ...(isExpense && hasItems && {
        items: items.map((i, idx) => ({
          name: i.name.trim(), amount: itemMinors[idx] as number, ...(Number(i.quantity) > 0 && { quantity: Number(i.quantity) }),
        })),
      }),
    };

    setBusy(true);
    setError("");
    try {
      await (editing ? updateTransaction(editing.id, payload) : createTransaction(payload));
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't save this. Your data has not been changed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">
        {isExpense ? "What did you buy?" : "Where did it come from?"}
        <input className={input} required maxLength={160} autoFocus value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder={isExpense ? "Hiking jacket" : "Freelance project"} />
      </label>

      {!hasItems && (
        <label className="block text-sm font-medium">
          Amount ({currency})
          <input className={input} required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="8500" />
        </label>
      )}

      <label className="block text-sm font-medium">
        Date
        <input className={input} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <label className="block text-sm font-medium">
        Category
        <select className={input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">No category</option>
          {catOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        {catOptions.length === 0 && <span className="mt-1 block text-xs font-normal text-stone">Optional. Create categories under Categories.</span>}
      </label>

      {isExpense && hasItems && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Items</legend>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_6rem_3.5rem_auto] items-end gap-2">
              <input aria-label={`Item ${idx + 1} name`} className={input.replace("mt-1 ", "")} placeholder="Item" value={it.name} onChange={(e) => setItem(idx, { name: e.target.value })} />
              <input aria-label={`Item ${idx + 1} amount`} className={input.replace("mt-1 ", "")} inputMode="decimal" placeholder="Amount" value={it.amount} onChange={(e) => setItem(idx, { amount: e.target.value })} />
              <input aria-label={`Item ${idx + 1} quantity`} className={input.replace("mt-1 ", "")} inputMode="numeric" placeholder="Qty" value={it.quantity} onChange={(e) => setItem(idx, { quantity: e.target.value })} />
              <button type="button" aria-label={`Remove item ${idx + 1}`} onClick={() => setItems(items.filter((_, i) => i !== idx))} className="px-2 py-2 text-stone hover:text-ink">✕</button>
            </div>
          ))}
          <p className="flex justify-between border-t border-rule pt-2 text-sm">
            <span>Total</span>
            <span className="font-semibold">{total === null ? "—" : formatMoney(total, currency)}</span>
          </p>
        </fieldset>
      )}

      {isExpense && (
        <button type="button" className="text-sm text-moss underline underline-offset-4"
          onClick={() => setItems([...items, { name: items.length === 0 ? description : "", amount: items.length === 0 ? amount : "", quantity: "" }])}>
          + Add {hasItems ? "another item" : "items"}
        </button>
      )}

      <details className="border-t border-rule pt-3" open={Boolean(editing && (merchant || spendingType || notes))}>
        <summary className="cursor-pointer text-sm font-medium">More details</summary>
        <div className="mt-3 space-y-4">
          {isExpense && (
            <>
              <label className="block text-sm font-medium">
                Store
                <input className={input} maxLength={120} value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Decathlon" />
              </label>
              <label className="block text-sm font-medium">
                Spending type
                <select className={input} value={spendingType} onChange={(e) => setSpendingType(e.target.value as SpendingType | "")}>
                  <option value="">Not set</option>
                  {SPENDING_TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </label>
            </>
          )}
          <label className="block text-sm font-medium">
            Notes
            <textarea className={input} rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
      </details>

      {error && <p role="alert" className="border-l-2 border-ochre pl-3 text-sm">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-stone hover:text-ink">Cancel</button>
        <button disabled={busy} className="rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Saving…" : editing ? "Save changes" : isExpense ? "Save expense" : "Save income"}
        </button>
      </div>
    </form>
  );
}

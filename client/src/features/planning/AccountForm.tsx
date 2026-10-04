import { FormEvent, useState } from "react";
import { ApiError } from "../../lib/api";
import { minorToInput, parseAmount } from "../../lib/money";
import { Account, ACCOUNT_KINDS, AccountKind, createAccount, updateAccount } from "./api";

const input = "mt-1 w-full rounded-sm border border-rule bg-white/60 px-3 py-2 outline-none focus:border-moss";

export function AccountForm({ editing, currency, onSaved, onCancel }: { editing?: Account; currency: string; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(editing?.kind ?? "bank");
  const [target, setTarget] = useState(editing?.target ? minorToInput(editing.target) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const t = kind === "savings" && target.trim() ? parseAmount(target) : undefined;
    if (kind === "savings" && target.trim() && t === null) return setError("Enter the target as an amount, for example 100000.");
    setBusy(true);
    setError("");
    try {
      const body = { name: name.trim(), kind, ...(t ? { target: t } : {}) };
      await (editing ? updateAccount(editing.id, body) : createAccount(body));
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't save this account. Nothing has been changed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">
        Name
        <input className={input} required autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Bank account" />
      </label>
      <label className="block text-sm font-medium">
        What kind of account is it?
        <select className={input} value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}>
          {ACCOUNT_KINDS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </label>
      {kind === "savings" && (
        <label className="block text-sm font-medium">
          Target ({currency}), optional
          <input className={input} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="100000" />
          <span className="mt-1 block text-xs font-normal text-stone">An amount you would like this account to reach. Leave it empty for none.</span>
        </label>
      )}
      {error && <p role="alert" className="border-l-2 border-ochre pl-3 text-sm">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-stone hover:text-ink">Cancel</button>
        <button disabled={busy} className="rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving\u2026" : editing ? "Save changes" : "Add account"}</button>
      </div>
    </form>
  );
}

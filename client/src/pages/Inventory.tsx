import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Modal } from "../components/Modal";
import { useAuth } from "../features/auth/AuthContext";
import { BalanceChart } from "../features/analytics/Charts";
import { monthLabel } from "../features/analytics/months";
import {
  Account, deleteAccount, deleteInventory, getOverview, InventoryRow, kindLabel, listAccounts, Overview, setAccountArchived,
} from "../features/planning/api";
import { AccountForm } from "../features/planning/AccountForm";
import { InventoryForm } from "../features/planning/InventoryForm";
import { countsLabel, describeTotalChange, describeUnaccounted, inventoryLabel, promptText, savingsPaceLine, wholeUnits } from "../features/planning/wording";
import { ApiError } from "../lib/api";
import { formatCalendarDay, todayIn } from "../lib/dates";
import { formatAmount, formatMoney, formatNet, formatSigned } from "../lib/money";
import { useTitle } from "../lib/useTitle";

const h2 = "font-display text-xl font-bold tracking-tight";
const tag = "ml-2 border border-ochre px-1.5 py-px text-xs text-ink";

export function Inventory() {
  useTitle("Inventory");
  const { user } = useAuth();
  const currency = user?.currency ?? "DZD";
  const today = todayIn(user?.timezone ?? "Africa/Algiers");
  const [params, setParams] = useSearchParams();

  const [overview, setOverview] = useState<Overview | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState<{ editing?: InventoryRow } | null>(null);
  const [accountForm, setAccountForm] = useState<{ editing?: Account } | null>(null);
  const [deleting, setDeleting] = useState<InventoryRow | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = () => Promise.all([getOverview(), listAccounts()])
    .then(([o, a]) => { setOverview(o); setAccounts(a.accounts); setError(""); })
    .catch((e) => setError(e instanceof ApiError ? e.message : "We couldn't load your inventory."));
  useEffect(() => { void load(); }, [retry]);

  // The Home prompt links here with ?new=1: open the form straight away, once.
  useEffect(() => {
    if (overview && params.get("new")) {
      setForm({});
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [overview]);

  async function act(fn: () => Promise<unknown>, failure: string) {
    if (busy) return false;
    setBusy(true);
    setActionError("");
    try { await fn(); await load(); return true; }
    catch (e) { setActionError(e instanceof ApiError ? e.message : failure); return false; }
    finally { setBusy(false); }
  }

  const active = accounts.filter((a) => !a.archived);
  const latest = overview?.periods[overview.periods.length - 1];
  const kindOf = new Map(accounts.map((a) => [a.id, a.kind]));
  const points = (overview?.inventories ?? []).map((i) => ({
    month: i.month, total: i.total, savings: i.balances.filter((b) => kindOf.get(b.accountId) === "savings").reduce((s, b) => s + b.amount, 0),
  }));
  const lastInventory = overview?.inventories[overview.inventories.length - 1];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Inventory</h1>
        <div className="flex gap-2">
          <button onClick={() => setAccountForm({})} className="rounded-sm border border-ink px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper">+ Account</button>
          <button onClick={() => setForm({})} className="rounded-sm bg-moss px-3 py-1.5 text-sm font-medium text-white">Take inventory</button>
        </div>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone">
        Once a month, count what you hold in each place: cash, bank, savings. The app then sets the change against what your entries explain, so you can see how well your records match your money.
      </p>

      {error && <p role="alert" className="mt-8 border-l-2 border-ochre pl-3 text-sm">{error} <button onClick={() => setRetry((n) => n + 1)} className="underline underline-offset-4">Try again</button></p>}
      {actionError && <p role="alert" className="mt-6 border-l-2 border-ochre pl-3 text-sm">{actionError}</p>}
      {!overview && !error && <p className="mt-8 text-stone">Loading{"\u2026"}</p>}

      {overview?.prompt && (
        <div className="mt-6 border-l-2 border-ochre bg-white/40 py-3 pl-4 pr-3 text-sm" role="note">{promptText(overview.prompt)}</div>
      )}

      {overview && accounts.length === 0 && (
        <section className="mt-8 max-w-xl">
          <h2 className={h2}>Start with the places you keep money</h2>
          <p className="mt-2 leading-relaxed">Add an account for each one, for example Cash, a bank account, and a savings account. Then take your first inventory: that is the baseline every later one is compared with.</p>
          <button onClick={() => setAccountForm({})} className="mt-4 rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white">Add your first account</button>
        </section>
      )}

      {overview && accounts.length > 0 && overview.inventories.length === 0 && (
        <p className="mt-8 max-w-xl leading-relaxed">You haven't taken an inventory yet. Count what each account holds, as of today or the end of last month. That first count is the baseline; after the next one, this page shows what changed.</p>
      )}
      {overview && overview.inventories.length === 1 && (
        <p className="mt-8 max-w-xl leading-relaxed text-stone">Baseline recorded for {inventoryLabel(overview.inventories[0].month).toLowerCase()}. After your next inventory, this page shows what changed and how much of it your entries explain.</p>
      )}

      {overview && latest && (
        <div className="mt-8 space-y-10">
          <section aria-labelledby="latest">
            <h2 id="latest" className={h2}>Latest change</h2>
            <p className="mt-1 text-sm text-stone">{countsLabel(latest.fromAsOf, latest.toAsOf)}</p>
            <p className="mt-3 leading-relaxed">{describeTotalChange(latest, currency)}</p>
            <dl className="mt-4 grid grid-cols-3 gap-4 border-y border-rule py-4">
              <div><dt className="text-sm text-stone">Counted change</dt><dd className="mt-1 text-base font-semibold sm:text-lg">{formatNet(latest.change, currency)}</dd></div>
              <div><dt className="text-sm text-stone">Entries explain</dt><dd className="mt-1 text-base font-semibold sm:text-lg">{formatNet(latest.recordedChange, currency)}</dd></div>
              <div><dt className="text-sm text-stone">Unaccounted for</dt><dd className="mt-1 text-base font-semibold sm:text-lg">{formatNet(latest.unexplained, currency)}</dd></div>
            </dl>
            <p className="mt-3 text-sm leading-relaxed">{describeUnaccounted(latest.unexplained, currency)}</p>
            <p className="mt-1 text-sm text-stone">{latest.entryCount} {latest.entryCount === 1 ? "entry" : "entries"} in this period: {formatMoney(latest.income, currency)} in, {formatMoney(latest.expenses, currency)} out. Moving money between your own accounts, such as into savings, changes nothing in the total.</p>
          </section>

          {overview.periods.length > 1 && (
            <section aria-labelledby="months">
              <h2 id="months" className={h2}>Month by month</h2>
              <table className="mt-3 w-full text-sm">
                <caption className="sr-only">For each period between two inventories: the change in what you hold, what your entries explain, and what is unaccounted for</caption>
                <thead>
                  <tr className="border-y border-rule text-stone">
                    <th scope="col" className="py-2 pr-2 text-left font-normal">Month</th>
                    <th scope="col" className="py-2 pl-2 text-right font-normal">Counted</th>
                    <th scope="col" className="py-2 pl-2 text-right font-normal">Entries</th>
                    <th scope="col" className="py-2 pl-2 text-right font-normal">Unaccounted</th>
                  </tr>
                </thead>
                <tbody>
                  {[...overview.periods].reverse().map((p) => (
                    <tr key={p.toAsOf} className="border-b border-rule last:border-0">
                      <th scope="row" className="py-2.5 pr-2 text-left font-medium">{monthLabel(p.fromMonth)}</th>
                      <td className="py-2.5 pl-2 text-right">{formatSigned(p.change)}</td>
                      <td className="py-2.5 pl-2 text-right">{formatSigned(p.recordedChange)}</td>
                      <td className="py-2.5 pl-2 text-right">{formatSigned(p.unexplained)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-stone">Amounts in {currency}. A period is named for the month it mostly covers.</p>
            </section>
          )}
        </div>
      )}

      {overview && overview.savings.length > 0 && (
        <section className="mt-10" aria-labelledby="savings">
          <h2 id="savings" className={h2}>Savings</h2>
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {overview.savings.map((s) => {
              const pace = savingsPaceLine(s, currency);
              return (
                <li key={s.accountId} className="py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium">{s.name}</span>
                    <span>{s.balance === null ? "not counted yet" : formatMoney(s.balance, currency)}</span>
                  </div>
                  {s.target !== null && s.progress !== null && (
                    <>
                      <div role="img" aria-label={`${s.name}: ${Math.round(s.progress * 100)}% of the target`} className="mt-2 h-2 w-full bg-rule">
                        <div className="h-full bg-moss" style={{ width: `${Math.min(s.progress, 1) * 100}%` }} />
                      </div>
                      <p className="mt-1 text-sm text-stone">{Math.round(s.progress * 100)}% of the {formatMoney(s.target, currency)} target</p>
                    </>
                  )}
                  {s.lastChange !== null && <p className="mt-1 text-sm text-stone">Last period: {formatNet(s.lastChange, currency)}{s.avgMonthlyChange !== null ? `. Recent average: ${formatNet(wholeUnits(s.avgMonthlyChange), currency)} a month.` : "."}</p>}
                  {pace && <p className="mt-1 text-sm">{pace}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {overview && overview.inventories.length >= 2 && (
        <section className="mt-10" aria-labelledby="over-time">
          <h2 id="over-time" className={h2}>Over time</h2>
          <div className="mt-3"><BalanceChart points={points} currency={currency} /></div>
        </section>
      )}

      {accounts.length > 0 && (
        <section className="mt-10" aria-labelledby="accounts">
          <div className="flex items-baseline justify-between">
            <h2 id="accounts" className={h2}>Accounts</h2>
            {accounts.some((a) => a.archived) && (
              <label className="flex items-center gap-2 text-sm text-stone"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Show archived</label>
            )}
          </div>
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {accounts.filter((a) => showArchived || !a.archived).map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <div>
                  <span className={a.archived ? "text-stone line-through" : "font-medium"}>{a.name}</span>
                  <span className="ml-2 text-sm text-stone">{a.name.toLowerCase() === kindLabel(a.kind).toLowerCase() ? "" : kindLabel(a.kind)}{a.name.toLowerCase() !== kindLabel(a.kind).toLowerCase() && a.target ? ", " : ""}{a.target ? `target ${formatMoney(a.target, currency)}` : ""}</span>
                  {a.archived && <span className="ml-2 text-sm text-stone">Archived</span>}
                  {a.demo && <span className={tag}>Example</span>}
                </div>
                <div className="flex gap-4 text-sm">
                  <button onClick={() => setAccountForm({ editing: a })} className="py-1 text-moss underline underline-offset-4">Edit</button>
                  <button disabled={busy} onClick={() => act(() => setAccountArchived(a.id, !a.archived), "We couldn't update this account. Nothing has been changed.")} className="py-1 text-stone underline underline-offset-4 hover:text-ink">{a.archived ? "Restore" : "Archive"}</button>
                  {(a.usage ?? 0) === 0 && <button disabled={busy} onClick={() => act(() => deleteAccount(a.id), "We couldn't delete this account. Nothing has been changed.")} className="py-1 text-stone underline underline-offset-4 hover:text-ink">Delete</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {overview && overview.inventories.length > 0 && (
        <section className="mt-10" aria-labelledby="counts">
          <h2 id="counts" className={h2}>Your inventories</h2>
          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {[...overview.inventories].reverse().map((i) => (
              <li key={i.id} className="py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span><span className="font-medium">{inventoryLabel(i.month)}</span>{i.demo && <span className={tag}>Example</span>}<span className="ml-3 text-sm text-stone">counted {formatCalendarDay(i.asOf)}</span></span>
                  <span className="shrink-0">{formatMoney(i.total, currency)}</span>
                </div>
                {i.notes && <p className="mt-1 text-sm italic text-stone">{i.notes}</p>}
                <div className="mt-1 flex gap-4 text-sm">
                  <button onClick={() => setForm({ editing: i })} className="py-1 text-moss underline underline-offset-4">Edit</button>
                  <button onClick={() => setDeleting(i)} className="py-1 text-stone underline underline-offset-4 hover:text-ink">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {form && (
        <Modal title={form.editing ? "Edit inventory" : "Take inventory"} onClose={() => setForm(null)}>
          <InventoryForm accounts={accounts} editing={form.editing} last={form.editing ? undefined : lastInventory} today={today} currency={currency} onCancel={() => setForm(null)} onSaved={async () => { setForm(null); await load(); }} />
        </Modal>
      )}
      {accountForm && (
        <Modal title={accountForm.editing ? "Edit account" : "Add account"} onClose={() => setAccountForm(null)}>
          <AccountForm editing={accountForm.editing} currency={currency} onCancel={() => setAccountForm(null)} onSaved={async () => { setAccountForm(null); await load(); }} />
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete this inventory?" onClose={() => setDeleting(null)}>
          <p className="font-medium">{inventoryLabel(deleting.month)}</p>
          <p className="mt-1 text-sm text-stone">Counted {formatCalendarDay(deleting.asOf)}, {formatMoney(deleting.total, currency)} in total.</p>
          <p className="mt-3 text-sm">The comparison with the inventories either side of it will be redone without it. Your entries are not touched.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setDeleting(null)} className="px-3 py-2 text-sm text-stone hover:text-ink">Keep it</button>
            <button disabled={busy} onClick={async () => { if (await act(() => deleteInventory(deleting.id), "We couldn't delete this inventory. Nothing has been changed.")) setDeleting(null); }} className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-60">{busy ? "Deleting\u2026" : "Delete"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

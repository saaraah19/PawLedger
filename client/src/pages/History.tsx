import { useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { useAuth } from "../features/auth/AuthContext";
import { useCategories } from "../features/categories/CategoriesContext";
import { categoryLabel, categoryOptions } from "../features/categories/tree";
import {
  deleteTransaction, formatDay, listTransactions, Page, SPENDING_TYPES, Sort, Transaction, TxType,
} from "../features/transactions/api";
import { useTransactionUi } from "../features/transactions/TransactionUi";
import { ApiError } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import { formatMoney } from "../lib/money";

const spendingLabel = Object.fromEntries(SPENDING_TYPES) as Record<string, string>;
const filters: [string, TxType | undefined][] = [["All", undefined], ["Expenses", "expense"], ["Income", "income"]];

export function History() {
  useTitle("History");
  const { user } = useAuth();
  const { openForm, version } = useTransactionUi();
  const { categories } = useCategories();
  const currency = user?.currency ?? "DZD";

  const [type, setType] = useState<TxType | undefined>();
  const [categoryId, setCategoryId] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    listTransactions({ page, type, sort, categoryId: categoryId || undefined })
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e instanceof ApiError ? e.message : "We couldn't load your history."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [page, type, sort, categoryId, version, retry]);

  async function confirmDelete() {
    if (!deleting || busy) return;
    setBusy(true);
    setDeleteError("");
    try {
      await deleteTransaction(deleting.id);
      if (data && data.items.length === 1 && page > 1) setPage(page - 1); // don't strand the user on an empty last page
      setDeleting(null);
      setRetry((n) => n + 1);
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "We couldn't delete this. Nothing has been changed.");
    } finally {
      setBusy(false);
    }
  }

  const pick = (t: TxType | undefined) => { setType(t); setCategoryId(""); setPage(1); };
  const filterOptions = categoryOptions(categories, { kind: type, keepId: categoryId });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">History</h1>
        <label className="text-sm text-stone">
          Sort{" "}
          <select value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }} className="rounded-sm border border-rule bg-transparent px-2 py-1 text-ink">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by type">
        {filters.map(([label, value]) => (
          <button key={label} aria-pressed={type === value} onClick={() => pick(value)}
            className={`rounded-sm border px-3 py-1 text-sm ${type === value ? "border-moss bg-moss text-white" : "border-rule text-stone hover:text-ink"}`}>
            {label}
          </button>
        ))}
        {(filterOptions.length > 0 || categoryId) && (
          <select aria-label="Filter by category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="ml-auto max-w-full rounded-sm border border-rule bg-transparent px-2 py-1 text-sm">
            <option value="">All categories</option>
            {filterOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-8 border-l-2 border-ochre pl-3 text-sm">
          {error}{" "}
          <button onClick={() => setRetry((n) => n + 1)} className="underline underline-offset-4">Try again</button>
        </p>
      )}
      {loading && !data && <p className="mt-8 text-stone">Loading your history…</p>}

      {data && data.total === 0 && !error && (
        <p className="mt-8 max-w-md leading-relaxed text-stone">
          {type || categoryId
            ? "No transactions match this filter."
            : "Nothing recorded yet. Your first transaction will become the first line in your financial history."}
        </p>
      )}

      {data && data.total > 0 && (
        <>
          <ul className={`mt-6 divide-y divide-rule border-y border-rule ${loading ? "opacity-60" : ""}`}>
            {data.items.map((t) => (
              <li key={t.id} className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">{t.description}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-stone">
                      <span>{formatDay(t.date)}</span>
                      {t.demo && <span className="border border-ochre px-1.5 py-px text-xs text-ink">Example</span>}
                      {t.categoryId && <span>{categoryLabel(categories, t.categoryId)}</span>}
                      {t.merchant && <span>{t.merchant}</span>}
                      {t.spendingType && <span>{spendingLabel[t.spendingType]}</span>}
                    </p>
                  </div>
                  <p className={`shrink-0 font-semibold ${t.type === "income" ? "text-moss" : ""}`}>
                    {t.type === "income" && "+"}{formatMoney(t.amount, currency)}
                  </p>
                </div>

                {t.items && (
                  <ul className="mt-2 space-y-0.5 border-l border-rule pl-3 text-sm text-stone">
                    {t.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between gap-4">
                        <span>{i.name}{i.quantity && i.quantity > 1 ? ` ×${i.quantity}` : ""}</span>
                        <span>{formatMoney(i.amount, currency)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {t.notes && <p className="mt-2 text-sm italic text-stone">{t.notes}</p>}

                <div className="mt-2 flex gap-4 text-sm">
                  <button onClick={() => openForm(t.type, t)} className="text-moss underline underline-offset-4">Edit</button>
                  <button onClick={() => { setDeleting(t); setDeleteError(""); }} className="text-stone underline underline-offset-4 hover:text-ink">Delete</button>
                </div>
              </li>
            ))}
          </ul>

          <nav aria-label="Pagination" className="mt-5 flex items-center justify-between text-sm">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-sm border border-rule px-3 py-1.5 disabled:opacity-40">Previous</button>
            <span className="text-stone">Page {data.page} of {data.totalPages}, {data.total} transactions</span>
            <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="rounded-sm border border-rule px-3 py-1.5 disabled:opacity-40">Next</button>
          </nav>
        </>
      )}

      {deleting && (
        <Modal title={deleting.type === "expense" ? "Delete this expense?" : "Delete this income?"} onClose={() => setDeleting(null)}>
          <p className="font-medium">{deleting.description}</p>
          <p className="mt-1 text-sm text-stone">{formatDay(deleting.date)}, {formatMoney(deleting.amount, currency)}</p>
          <p className="mt-3 text-sm">This can't be undone.</p>
          {deleteError && <p role="alert" className="mt-3 border-l-2 border-ochre pl-3 text-sm">{deleteError}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setDeleting(null)} className="px-3 py-2 text-sm text-stone hover:text-ink">Keep it</button>
            <button onClick={confirmDelete} disabled={busy} className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-60">
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

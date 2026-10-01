import { useEffect, useState } from "react";
import { Modal } from "../components/Modal";
import { Category, deleteCategory, setCategoryArchived } from "../features/categories/api";
import { useCategories } from "../features/categories/CategoriesContext";
import { CategoryForm } from "../features/categories/CategoryForm";
import { buildTree } from "../features/categories/tree";
import type { TxType } from "../features/transactions/api";
import { ApiError } from "../lib/api";
import { useTitle } from "../lib/useTitle";

type FormState = { editing?: Category; presetParentId?: string } | null;

export function Categories() {
  useTitle("Categories");
  const { categories, loading, refresh } = useCategories();
  const [kind, setKind] = useState<TxType>("expense");
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh(); // usage counts change as transactions are added elsewhere
  }, [refresh]);

  const tree = buildTree(categories, kind)
    .filter((n) => showArchived || !n.category.archived)
    .map((n) => ({ ...n, children: n.children.filter((c) => showArchived || !c.archived) }));
  const hasArchived = categories.some((c) => c.kind === kind && c.archived);

  async function act(fn: () => Promise<unknown>, failure: string) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : failure);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const row = (c: Category, hasKids: boolean, isChild: boolean) => (
    <li key={c.id} className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 ${isChild ? "ml-6 border-l border-rule pl-4" : ""}`}>
      <div>
        <span className={c.archived ? "text-stone line-through" : "font-medium"}>{c.name}</span>
        {c.archived && <span className="ml-2 text-sm text-stone">Archived</span>}
        {c.demo && <span className="ml-2 border border-ochre px-1.5 py-px text-xs text-ink">Example</span>}
        <span className="ml-3 text-sm text-stone">{c.usage} {c.usage === 1 ? "transaction" : "transactions"}</span>
      </div>
      <div className="flex gap-4 text-sm">
        {!isChild && !c.archived && (
          <button onClick={() => setForm({ presetParentId: c.id })} className="text-moss underline underline-offset-4">Add sub-category</button>
        )}
        <button onClick={() => setForm({ editing: c })} className="text-moss underline underline-offset-4">Edit</button>
        <button
          disabled={busy}
          onClick={() => act(() => setCategoryArchived(c.id, !c.archived), "We couldn't update this category. Nothing has been changed.")}
          className="text-stone underline underline-offset-4 hover:text-ink"
        >
          {c.archived ? "Restore" : "Archive"}
        </button>
        {c.usage === 0 && !hasKids && (
          <button onClick={() => { setDeleting(c); setError(""); }} className="text-stone underline underline-offset-4 hover:text-ink">Delete</button>
        )}
      </div>
    </li>
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight">Categories</h1>
        <button onClick={() => setForm({})} className="rounded-sm border border-ink px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper">
          + New category
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2" role="group" aria-label="Kind of category">
        {(["expense", "income"] as const).map((k) => (
          <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}
            className={`rounded-sm border px-3 py-1 text-sm ${kind === k ? "border-moss bg-moss text-white" : "border-rule text-stone hover:text-ink"}`}>
            {k === "expense" ? "Expenses" : "Income"}
          </button>
        ))}
        {hasArchived && (
          <label className="ml-auto flex items-center gap-2 text-sm text-stone">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        )}
      </div>

      {error && <p role="alert" className="mt-6 border-l-2 border-ochre pl-3 text-sm">{error}</p>}

      {loading && categories.length === 0 && <p className="mt-8 text-stone">Loading your categories…</p>}

      {!loading && tree.length === 0 && (
        <p className="mt-8 max-w-md leading-relaxed text-stone">
          {kind === "expense"
            ? "No expense categories yet. Create the ones that describe where your money goes, such as Hiking or Education. Categories are optional; you can record spending without them."
            : "No income categories yet. Create the ones that describe where money comes from, such as Freelance or Gifts. They're optional."}
        </p>
      )}

      {tree.length > 0 && (
        <ul className="mt-6 divide-y divide-rule border-y border-rule">
          {tree.map(({ category, children }) => (
            <li key={category.id} className="list-none">
              <ul>
                {row(category, children.length > 0, false)}
                {children.map((c) => row(c, false, true))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {form && (
        <Modal title={form.editing ? "Edit category" : form.presetParentId ? "New sub-category" : "New category"} onClose={() => setForm(null)}>
          <CategoryForm
            kind={form.editing?.kind ?? kind}
            editing={form.editing}
            presetParentId={form.presetParentId}
            onCancel={() => setForm(null)}
            onSaved={async () => { setForm(null); await refresh(); }}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete this category?" onClose={() => setDeleting(null)}>
          <p className="font-medium">{deleting.name}</p>
          <p className="mt-2 text-sm">It has no transactions, so nothing in your history changes. This can't be undone.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setDeleting(null)} className="px-3 py-2 text-sm text-stone hover:text-ink">Keep it</button>
            <button disabled={busy} onClick={async () => { if (await act(() => deleteCategory(deleting.id), "We couldn't delete this category. Nothing has been changed.")) setDeleting(null); }}
              className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-60">
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

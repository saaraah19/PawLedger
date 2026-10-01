import { FormEvent, useState } from "react";
import { ApiError } from "../../lib/api";
import type { TxType } from "../transactions/api";
import { Category, createCategory, updateCategory } from "./api";
import { useCategories } from "./CategoriesContext";

const input = "mt-1 w-full rounded-sm border border-rule bg-white/60 px-3 py-2 outline-none focus:border-moss";

export function CategoryForm({ kind, editing, presetParentId, onSaved, onCancel }: {
  kind: TxType; editing?: Category; presetParentId?: string; onSaved: () => void; onCancel: () => void;
}) {
  const { categories } = useCategories();
  const [name, setName] = useState(editing?.name ?? "");
  const [parentId, setParentId] = useState(editing?.parentId ?? presetParentId ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const hasChildren = editing ? categories.some((c) => c.parentId === editing.id) : false;
  // Only active top-level categories of the same kind can be parents (nesting is one level deep).
  const parents = categories
    .filter((c) => c.kind === kind && !c.parentId && !c.archived && c.id !== editing?.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const body = { name: name.trim(), ...(parentId && { parentId }) };
      await (editing ? updateCategory(editing.id, body) : createCategory({ ...body, kind }));
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't save this category. Nothing has been changed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">
        Name
        <input className={input} required autoFocus maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "expense" ? "Hiking" : "Freelance"} />
      </label>

      {hasChildren ? (
        <p className="text-sm text-stone">This category has sub-categories, so it stays at the top level.</p>
      ) : (
        <label className="block text-sm font-medium">
          Sits under
          <select className={input} value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Nothing (top level)</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      )}

      {error && <p role="alert" className="border-l-2 border-ochre pl-3 text-sm">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-stone hover:text-ink">Cancel</button>
        <button disabled={busy} className="rounded-sm bg-moss px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Saving…" : editing ? "Save changes" : "Create category"}
        </button>
      </div>
    </form>
  );
}

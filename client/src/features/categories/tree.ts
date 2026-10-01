import type { TxType } from "../transactions/api";
import type { Category } from "./api";

export type CategoryNode = { category: Category; children: Category[] };

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

/** Parents sorted by name, each with its sub-categories sorted by name. One kind at a time. */
export function buildTree(all: Category[], kind: TxType): CategoryNode[] {
  const list = all.filter((c) => c.kind === kind);
  const ids = new Set(list.map((c) => c.id));
  const roots = list.filter((c) => !c.parentId || !ids.has(c.parentId)).sort(byName);
  return roots.map((category) => ({
    category,
    children: list.filter((c) => c.parentId === category.id).sort(byName),
  }));
}

/** "Hiking / Gear" for a sub-category, "Hiking" for a top-level one. Empty string if unknown. */
export function categoryLabel(all: Category[], id?: string): string {
  const c = all.find((x) => x.id === id);
  if (!c) return "";
  const parent = c.parentId ? all.find((x) => x.id === c.parentId) : undefined;
  return parent ? `${parent.name} / ${c.name}` : c.name;
}

/**
 * Choices for a category picker, parents before their children. Archived categories are hidden,
 * except `keepId` (the one already on a transaction being edited or filtered on).
 */
export function categoryOptions(all: Category[], opts: { kind?: TxType; keepId?: string } = {}) {
  const kinds: TxType[] = opts.kind ? [opts.kind] : ["expense", "income"];
  const out: { id: string; label: string }[] = [];
  for (const kind of kinds) {
    for (const { category, children } of buildTree(all, kind)) {
      for (const c of [category, ...children]) {
        if (c.archived && c.id !== opts.keepId) continue;
        const suffix = `${c.archived ? " (archived)" : ""}${opts.kind ? "" : ` (${kind})`}`;
        out.push({ id: c.id, label: categoryLabel(all, c.id) + suffix });
      }
    }
  }
  return out;
}

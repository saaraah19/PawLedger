export type SubRow = { categoryId: string; name: string; total: number; count: number };
export type CategoryRow = { categoryId: string | null; name: string; total: number; count: number; children: SubRow[] };

type Grouped = { _id: string | null; total: number; count: number };
type Cat = { id: string; name: string; parentId?: string };

/**
 * Rolls per-category expense totals up to their top-level category, keeping sub-category detail.
 * Transactions with no category, or whose category can't be found, land in "No category".
 * A parent's total includes its own transactions plus all of its sub-categories'.
 */
export function rollupByCategory(rows: Grouped[], cats: Cat[]): CategoryRow[] {
  const byId = new Map(cats.map((c) => [c.id, c]));
  const buckets = new Map<string | null, CategoryRow>();
  const bucket = (id: string | null, name: string) => {
    if (!buckets.has(id)) buckets.set(id, { categoryId: id, name, total: 0, count: 0, children: [] });
    return buckets.get(id)!;
  };

  for (const row of rows) {
    const cat = row._id ? byId.get(row._id) : undefined;
    if (!cat) {
      const b = bucket(null, "No category");
      b.total += row.total;
      b.count += row.count;
      continue;
    }
    const parent = cat.parentId ? byId.get(cat.parentId) : undefined;
    if (parent) {
      const b = bucket(parent.id, parent.name);
      b.total += row.total;
      b.count += row.count;
      b.children.push({ categoryId: cat.id, name: cat.name, total: row.total, count: row.count });
    } else {
      const b = bucket(cat.id, cat.name);
      b.total += row.total;
      b.count += row.count;
    }
  }

  const byTotal = <T extends { total: number; name: string }>(a: T, b: T) => b.total - a.total || a.name.localeCompare(b.name);
  const out = [...buckets.values()].sort(byTotal);
  out.forEach((b) => b.children.sort(byTotal));
  return out;
}

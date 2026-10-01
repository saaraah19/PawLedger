import { describe, expect, it } from "vitest";
import type { Category } from "./api";
import { buildTree, categoryLabel, categoryOptions } from "./tree";

const c = (id: string, name: string, extra: Partial<Category> = {}): Category => ({
  id, name, kind: "expense", archived: false, usage: 0, ...extra,
});
const all = [
  c("h", "Hiking"),
  c("hg", "Gear", { parentId: "h" }),
  c("hc", "Clothing", { parentId: "h" }),
  c("e", "Education"),
  c("old", "Old hobby", { archived: true }),
  c("s", "Salary", { kind: "income" }),
];

describe("category tree", () => {
  it("sorts parents and children by name and separates kinds", () => {
    const tree = buildTree(all, "expense");
    expect(tree.map((n) => n.category.name)).toEqual(["Education", "Hiking", "Old hobby"]);
    expect(tree[1].children.map((x) => x.name)).toEqual(["Clothing", "Gear"]);
    expect(buildTree(all, "income")).toHaveLength(1);
  });

  it("labels sub-categories with their parent", () => {
    expect(categoryLabel(all, "hg")).toBe("Hiking / Gear");
    expect(categoryLabel(all, "h")).toBe("Hiking");
    expect(categoryLabel(all, "missing")).toBe("");
  });

  it("offers parents before children and hides archived ones", () => {
    expect(categoryOptions(all, { kind: "expense" }).map((o) => o.label)).toEqual([
      "Education", "Hiking", "Hiking / Clothing", "Hiking / Gear",
    ]);
  });

  it("keeps an archived category visible when it is already in use", () => {
    const labels = categoryOptions(all, { kind: "expense", keepId: "old" }).map((o) => o.label);
    expect(labels).toContain("Old hobby (archived)");
  });

  it("marks the kind when both kinds are listed", () => {
    expect(categoryOptions(all).map((o) => o.label)).toContain("Salary (income)");
  });
});

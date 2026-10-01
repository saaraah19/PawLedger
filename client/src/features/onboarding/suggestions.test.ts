import { describe, expect, it } from "vitest";
import { alreadyExists, SUGGESTIONS, toCreate } from "./suggestions";

const existing = [
  { name: "groceries ", kind: "expense" },
  { name: "Gear", kind: "expense", parentId: "hiking" },
  { name: "Salary", kind: "income" },
];

describe("suggestions", () => {
  it("has unique names within each kind, and something preselected in both", () => {
    for (const kind of ["expense", "income"] as const) {
      const names = SUGGESTIONS.filter((s) => s.kind === kind).map((s) => s.name.toLowerCase());
      expect(new Set(names).size).toBe(names.length);
      expect(SUGGESTIONS.some((s) => s.kind === kind && s.preselected)).toBe(true);
    }
  });
  it("recognises existing categories regardless of case and spacing", () => {
    expect(alreadyExists(existing, { name: "Groceries", kind: "expense" })).toBe(true);
    expect(alreadyExists(existing, { name: "Groceries", kind: "income" })).toBe(false); // other kind
    expect(alreadyExists(existing, { name: "Gear", kind: "expense" })).toBe(false); // only top-level ones count
  });
  it("only creates what is missing", () => {
    const picked = SUGGESTIONS.filter((s) => ["Groceries", "Transport", "Salary"].includes(s.name));
    expect(toCreate(existing, picked).map((s) => s.name)).toEqual(["Transport"]);
    expect(toCreate([], picked)).toHaveLength(3);
  });
});

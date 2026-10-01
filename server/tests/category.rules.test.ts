import { describe, expect, it } from "vitest";
import { parentProblem } from "../src/services/category.rules";

const parent = { kind: "expense", archived: false };
const args = { parentId: "p1", parent, kind: "expense", selfHasChildren: false, checkArchived: true };

describe("parentProblem", () => {
  it("allows top level and a valid child", () => {
    expect(parentProblem({ ...args, parentId: undefined, parent: null })).toBeNull();
    expect(parentProblem(args)).toBeNull();
  });
  it("blocks a missing parent, self-parenting, and deep nesting", () => {
    expect(parentProblem({ ...args, parent: null })).toMatch(/wasn't found/);
    expect(parentProblem({ ...args, selfId: "p1" })).toMatch(/own parent/);
    expect(parentProblem({ ...args, parent: { ...parent, parentId: "x" } })).toMatch(/one level/);
  });
  it("blocks mixing kinds and nesting a category that already has children", () => {
    expect(parentProblem({ ...args, kind: "income" })).toMatch(/same kind/);
    expect(parentProblem({ ...args, selfHasChildren: true })).toMatch(/has sub-categories/);
  });
  it("only complains about an archived parent when placement is changing", () => {
    const archived = { ...parent, archived: true };
    expect(parentProblem({ ...args, parent: archived })).toMatch(/archived/);
    expect(parentProblem({ ...args, parent: archived, checkArchived: false })).toBeNull();
  });
});

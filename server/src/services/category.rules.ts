type ParentLike = { kind: string; parentId?: unknown; archived: boolean };

/** Pure placement rules for a category. Returns a message for the user, or null when the placement is fine. */
export function parentProblem(a: {
  parentId?: string;
  selfId?: string;
  parent: ParentLike | null;
  kind: string;
  selfHasChildren: boolean;
  checkArchived: boolean;
}): string | null {
  if (!a.parentId) return null;
  if (a.selfId && a.parentId === a.selfId) return "A category can't be its own parent.";
  if (!a.parent) return "That parent category wasn't found.";
  if (a.parent.parentId) return "Categories can only be nested one level deep.";
  if (a.parent.kind !== a.kind) return "A sub-category must be the same kind as its parent.";
  if (a.selfHasChildren) return "This category has sub-categories, so it can't become one itself.";
  if (a.checkArchived && a.parent.archived) return "That parent category is archived. Restore it first.";
  return null;
}

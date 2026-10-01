import type { TxType } from "../transactions/api";

export type Suggestion = { name: string; kind: TxType; preselected: boolean };

// Only suggestions: nothing is created unless the person ticks it, and every one can be renamed or archived later.
export const SUGGESTIONS: Suggestion[] = [
  { name: "Groceries", kind: "expense", preselected: true },
  { name: "Transport", kind: "expense", preselected: true },
  { name: "Bills", kind: "expense", preselected: true },
  { name: "Eating out", kind: "expense", preselected: true },
  { name: "Health", kind: "expense", preselected: true },
  { name: "Education", kind: "expense", preselected: false },
  { name: "Hobbies", kind: "expense", preselected: false },
  { name: "Personal", kind: "expense", preselected: false },
  { name: "Technology", kind: "expense", preselected: false },
  { name: "Salary", kind: "income", preselected: true },
  { name: "Freelance", kind: "income", preselected: false },
  { name: "Gifts", kind: "income", preselected: false },
  { name: "Refunds", kind: "income", preselected: false },
];

const norm = (s: string) => s.trim().toLocaleLowerCase("en");

/** Whether a top-level category of this kind and name already exists (case-insensitive). */
export function alreadyExists(existing: { name: string; kind: string; parentId?: string }[], s: Pick<Suggestion, "name" | "kind">): boolean {
  return existing.some((c) => !c.parentId && c.kind === s.kind && norm(c.name) === norm(s.name));
}

/** The picked suggestions that still need creating. */
export function toCreate(existing: { name: string; kind: string; parentId?: string }[], picked: Suggestion[]): Suggestion[] {
  return picked.filter((s) => !alreadyExists(existing, s));
}

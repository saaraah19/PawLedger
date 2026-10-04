import { api } from "../../lib/api";

export type AccountKind = "cash" | "bank" | "savings" | "other";
export const ACCOUNT_KINDS: [AccountKind, string][] = [["cash", "Cash"], ["bank", "Bank"], ["savings", "Savings"], ["other", "Other"]];
export const kindLabel = (k: string) => ACCOUNT_KINDS.find(([v]) => v === k)?.[1] ?? k;

export type Account = { id: string; name: string; kind: AccountKind; target?: number | null; archived: boolean; demo?: boolean; usage?: number };
export type Balance = { accountId: string; amount: number };
export type InventoryRow = { id: string; month: string; asOf: string; balances: Balance[]; total: number; notes?: string; demo: boolean };
export type Period = {
  fromMonth: string; toMonth: string; fromAsOf: string; toAsOf: string; days: number;
  totalBefore: number; totalAfter: number; change: number;
  income: number; expenses: number; entryCount: number; recordedChange: number; unexplained: number;
  savingsBefore: number; savingsAfter: number; savingsChange: number;
  byAccount: { accountId: string; before: number; after: number; change: number }[];
};
export type SavingsRow = {
  accountId: string; name: string; balance: number | null; target: number | null; progress: number | null;
  lastChange: number | null; avgMonthlyChange: number | null; monthsToTarget: number | null;
};
export type Prompt = { month: string; reason: "month_end" | "month_start" } | null;
export type Overview = { accounts: Account[]; inventories: InventoryRow[]; periods: Period[]; savings: SavingsRow[]; prompt: Prompt };

export type AccountBody = { name: string; kind: AccountKind; target?: number };
export type InventoryBody = { asOf: string; balances: Balance[]; notes?: string };

export const listAccounts = () => api<{ accounts: Account[] }>("/accounts");
export const createAccount = (body: AccountBody) => api("/accounts", { method: "POST", body });
export const updateAccount = (id: string, body: AccountBody) => api(`/accounts/${id}`, { method: "PUT", body });
export const setAccountArchived = (id: string, archived: boolean) => api(`/accounts/${id}/archive`, { method: "PATCH", body: { archived } });
export const deleteAccount = (id: string) => api(`/accounts/${id}`, { method: "DELETE" });

export const getOverview = () => api<Overview>("/inventories/overview");
export const getInventoryPrompt = () => api<{ prompt: Prompt }>("/inventories/prompt");
export const saveInventory = (id: string | undefined, body: InventoryBody) =>
  id ? api(`/inventories/${id}`, { method: "PUT", body }) : api("/inventories", { method: "POST", body });
export const deleteInventory = (id: string) => api(`/inventories/${id}`, { method: "DELETE" });

// ---- plans
export type PlanLine = { categoryId: string; amount: number };
export type Plan = { month: string; expectedSpending: number; expectedIncome?: number; expectedSaving?: number; categories?: PlanLine[]; notes?: string; demo?: boolean };
export type PlanBody = Omit<Plan, "month" | "demo">;
type Line = { expected: number; actual: number; difference: number; usedShare: number };
export type PlanView = {
  month: string; currentMonth: string;
  state: { state: "past" | "current" | "future"; day: number; daysInMonth: number; elapsedShare: number };
  plan: Plan | null; previousPlan: Plan | null;
  actual: { expenses: { total: number; count: number }; income: { total: number; count: number } };
  savedActual: number | null;
  review: {
    spending: Line; income: Line | null;
    saving: { expected: number; actual: number | null; difference: number | null } | null;
    categories: (Line & { categoryId: string; name: string; count: number })[];
  } | null;
  history: { month: string; expected: number; actual: number; usedShare: number }[];
};

export const getPlanView = (month?: string) => api<PlanView>(`/plans${month ? `?month=${month}` : ""}`);
export const savePlan = (month: string, body: PlanBody) => api(`/plans/${month}`, { method: "PUT", body });
export const deletePlan = (month: string) => api(`/plans/${month}`, { method: "DELETE" });

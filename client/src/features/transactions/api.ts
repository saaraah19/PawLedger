import { api } from "../../lib/api";
import { formatCalendarDay, todayIn as todayInZone } from "../../lib/dates";

export type TxType = "expense" | "income";
export const SPENDING_TYPES = [
  ["necessity", "Necessity"],
  ["good_to_have", "Good to have"],
  ["complementary", "Complementary"],
  ["impulse", "Impulse / Unplanned"],
  ["other", "Other"],
] as const;
export type SpendingType = (typeof SPENDING_TYPES)[number][0];

export type TxItem = { name: string; amount: number; quantity?: number };
export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  date: string; // ISO; the calendar day is its UTC date
  description: string;
  merchant?: string;
  categoryId?: string;
  spendingType?: SpendingType;
  notes?: string;
  items?: TxItem[];
  demo?: boolean; // example data; cleared when the entry is edited
};
export type TxPayload = Omit<Transaction, "id" | "date"> & { date: string };
export type Sort = "newest" | "oldest" | "highest" | "lowest";
export type Page = { items: Transaction[]; total: number; page: number; limit: number; totalPages: number };

export const listTransactions = (p: { page: number; limit?: number; type?: TxType; sort: Sort; categoryId?: string }) => {
  const q = new URLSearchParams({ page: String(p.page), limit: String(p.limit ?? 20), sort: p.sort });
  if (p.type) q.set("type", p.type);
  if (p.categoryId) q.set("categoryId", p.categoryId);
  return api<Page>(`/transactions?${q}`);
};
export const createTransaction = (body: TxPayload) => api("/transactions", { method: "POST", body });
export const updateTransaction = (id: string, body: TxPayload) => api(`/transactions/${id}`, { method: "PUT", body });
export const deleteTransaction = (id: string) => api(`/transactions/${id}`, { method: "DELETE" });

/** The calendar day of a stored transaction, as "28 Sep 2026". */
export const formatDay = formatCalendarDay;
export const dayInput = (iso: string) => iso.slice(0, 10);
/** Today's date in the user's timezone as YYYY-MM-DD. */
export const todayIn = (timeZone: string) => todayInZone(timeZone);

import { lastDayOf, monthIndex, shiftMonth } from "./analytics.range";

// Pure rules for the monthly inventory. An inventory is a count of what you hold in each account, as of the end of a day.

export type Balance = { accountId: string; amount: number }; // minor units; negative is allowed (an overdraft, a debt)
export type InventoryLike = { id: string; month: string; asOf: string; balances: Balance[] }; // asOf is YYYY-MM-DD
export type AccountLike = { id: string; name: string; kind: string; target?: number | null; archived?: boolean };
export type Bucket = { income: number; expenses: number; count: number };

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
export const totalOf = (b: Balance[]) => sum(b.map((x) => x.amount));
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/**
 * The month an inventory belongs to is the month that is starting. Counting on the 1st to the 16th belongs to that
 * month ("the 1st"), counting on the 17th or later belongs to the next ("the end of the month").
 */
export function inventoryMonth(asOf: string): string {
  const [y, m, d] = asOf.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 15)).toISOString().slice(0, 7);
}

/** Totals of recorded income and spending between consecutive inventory dates. An entry dated on a count day belongs to the period that ends that day. */
export function bucketEntries(txs: { date: string; type: string; amount: number }[], asOfs: string[]): Bucket[] {
  const out: Bucket[] = Array.from({ length: Math.max(0, asOfs.length - 1) }, () => ({ income: 0, expenses: 0, count: 0 }));
  for (const t of txs) {
    const i = out.findIndex((_, k) => t.date > asOfs[k] && t.date <= asOfs[k + 1]);
    if (i < 0) continue;
    if (t.type === "income") out[i].income += t.amount;
    else out[i].expenses += t.amount;
    out[i].count++;
  }
  return out;
}

export type Period = {
  fromMonth: string; toMonth: string; fromAsOf: string; toAsOf: string; days: number;
  totalBefore: number; totalAfter: number; change: number;
  income: number; expenses: number; entryCount: number; recordedChange: number;
  /** What the total changed by, beyond what the recorded entries explain. Positive: more money than the entries explain. */
  unexplained: number;
  savingsBefore: number; savingsAfter: number; savingsChange: number;
  byAccount: { accountId: string; before: number; after: number; change: number }[];
};

/** Compares each inventory with the one before it: what changed, what the entries explain, and what is left over. */
export function reconcile(invs: InventoryLike[], accounts: AccountLike[], buckets: Bucket[]): Period[] {
  const kind = new Map(accounts.map((a) => [a.id, a.kind]));
  const savingsOf = (b: Balance[]) => sum(b.filter((x) => kind.get(x.accountId) === "savings").map((x) => x.amount));
  const periods: Period[] = [];
  for (let i = 1; i < invs.length; i++) {
    const a = invs[i - 1], b = invs[i];
    const bk = buckets[i - 1] ?? { income: 0, expenses: 0, count: 0 };
    const before = new Map(a.balances.map((x) => [x.accountId, x.amount]));
    const after = new Map(b.balances.map((x) => [x.accountId, x.amount]));
    const totalBefore = totalOf(a.balances), totalAfter = totalOf(b.balances);
    const recordedChange = bk.income - bk.expenses;
    periods.push({
      fromMonth: a.month, toMonth: b.month, fromAsOf: a.asOf, toAsOf: b.asOf, days: daysBetween(a.asOf, b.asOf),
      totalBefore, totalAfter, change: totalAfter - totalBefore,
      income: bk.income, expenses: bk.expenses, entryCount: bk.count, recordedChange,
      unexplained: totalAfter - totalBefore - recordedChange,
      savingsBefore: savingsOf(a.balances), savingsAfter: savingsOf(b.balances), savingsChange: savingsOf(b.balances) - savingsOf(a.balances),
      // An account missing from one inventory counts as zero there, so list every account every time.
      byAccount: [...new Set([...before.keys(), ...after.keys()])].map((id) => ({
        accountId: id, before: before.get(id) ?? 0, after: after.get(id) ?? 0, change: (after.get(id) ?? 0) - (before.get(id) ?? 0),
      })),
    });
  }
  return periods;
}

export type SavingsRow = {
  accountId: string; name: string; balance: number | null; target: number | null; progress: number | null;
  lastChange: number | null; avgMonthlyChange: number | null; monthsToTarget: number | null;
};

/** Where each savings account stands, with the arithmetic "if the recent pace continued" (never a recommendation). */
export function savingsSummary(accounts: AccountLike[], invs: InventoryLike[], periods: Period[]): SavingsRow[] {
  const latest = invs[invs.length - 1];
  const recent = periods.slice(-3);
  // Months between the inventories' own months, so a 31-day month isn't mistaken for 1.02 of one. A skipped month counts as two.
  const months = sum(recent.map((p) => monthIndex(p.toMonth) - monthIndex(p.fromMonth)));
  const rows: SavingsRow[] = [];
  for (const a of accounts.filter((x) => x.kind === "savings")) {
    const balance = latest?.balances.find((b) => b.accountId === a.id)?.amount ?? null;
    if (balance === null && a.archived) continue;
    const changes = recent.map((p) => p.byAccount.find((x) => x.accountId === a.id)?.change ?? 0);
    const avg = recent.length > 0 && months > 0 ? Math.round(sum(changes) / months) : null;
    const target = a.target ?? null;
    const last = periods[periods.length - 1]?.byAccount.find((x) => x.accountId === a.id)?.change ?? null;
    rows.push({
      accountId: a.id, name: a.name, balance, target,
      progress: target && balance !== null ? balance / target : null,
      lastChange: periods.length > 0 ? last : null,
      avgMonthlyChange: avg,
      monthsToTarget: target && balance !== null && avg !== null && avg > 0 && balance < target ? Math.ceil((target - balance) / avg) : null,
    });
  }
  return rows;
}

/**
 * Is an inventory due? Near the end of a month (the last five days) the next month's is due, and in the first
 * week the current month's is. Outside those windows nothing is asked. Returns null if it has already been taken.
 */
export function inventoryPrompt(today: string, takenMonths: string[]): { month: string; reason: "month_end" | "month_start" } | null {
  const currentMonth = today.slice(0, 7);
  const day = Number(today.slice(8, 10));
  let month: string, reason: "month_end" | "month_start";
  if (day <= 7) { month = currentMonth; reason = "month_start"; }
  else if (day >= lastDayOf(currentMonth) - 4) { month = shiftMonth(currentMonth, 1); reason = "month_end"; }
  else return null;
  return takenMonths.includes(month) ? null : { month, reason };
}

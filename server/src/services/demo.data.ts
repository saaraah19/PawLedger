import { lastDayOf, shiftMonth } from "./analytics.range";
import { bucketEntries } from "./inventory.logic";

export type DemoCategory = { key: string; name: string; kind: "expense" | "income"; parentKey?: string };
export type DemoTransaction = {
  type: "expense" | "income";
  amount: number; // minor units
  date: string; // YYYY-MM-DD, never later than today
  description: string;
  categoryKey: string;
  merchant?: string;
  spendingType?: "necessity" | "good_to_have" | "complementary" | "impulse" | "other";
  notes?: string;
  items?: { name: string; amount: number }[];
};

export const DEMO_CATEGORIES: DemoCategory[] = [
  { key: "hiking", name: "Hiking", kind: "expense" },
  { key: "hiking-gear", name: "Gear", kind: "expense", parentKey: "hiking" },
  { key: "hiking-food", name: "Food", kind: "expense", parentKey: "hiking" },
  { key: "hiking-trips", name: "Transportation", kind: "expense", parentKey: "hiking" },
  { key: "groceries", name: "Groceries", kind: "expense" },
  { key: "eating-out", name: "Eating out", kind: "expense" },
  { key: "transport", name: "Transport", kind: "expense" },
  { key: "bills", name: "Bills", kind: "expense" },
  { key: "education", name: "Education", kind: "expense" },
  { key: "courses", name: "Courses", kind: "expense", parentKey: "education" },
  { key: "books", name: "Books", kind: "expense", parentKey: "education" },
  { key: "personal", name: "Personal", kind: "expense" },
  { key: "freelance", name: "Freelance", kind: "income" },
  { key: "gifts", name: "Gifts", kind: "income" },
  { key: "refunds", name: "Refunds", kind: "income" },
];

type Spec = Omit<DemoTransaction, "amount" | "date" | "items"> & { day: number; dzd: number; items?: { name: string; dzd: number }[] };
const x = (day: number, description: string, dzd: number, categoryKey: string, more: Partial<Spec> = {}): Spec => ({
  type: "expense", day, description, dzd, categoryKey, ...more,
});
const inc = (day: number, description: string, dzd: number, categoryKey: string, more: Partial<Spec> = {}): Spec =>
  x(day, description, dzd, categoryKey, { type: "income", ...more });

/** Five months of plausible entries, oldest first (index 4 is the current month). Amounts in DZD. */
function monthSpecs(i: number): Spec[] {
  const wiggle = [0, 150, -100, 200, 100][i];
  const list: Spec[] = [
    inc(5, "Freelance project", [36000, 39000, 38000, 40000, 42000][i], "freelance"),
    x(3, "Phone plan", 1500, "bills", { spendingType: "necessity", merchant: "Mobile operator" }),
    x(8, "Internet", 2500, "bills", { spendingType: "necessity", merchant: "Internet provider" }),
    ...[4, 11, 18, 25].map((d, w) => x(d, "Groceries", [2400, 2600, 2500, 2700][w] + wiggle, "groceries", { spendingType: "necessity", merchant: "Local grocery" })),
    ...[6, 14, 22].map((d, w) => x(d, "Bus and taxi", [400, 600, 500][w], "transport", { spendingType: "necessity" })),
    x(9, "Lunch out", 1800 + wiggle * 2, "eating-out", { spendingType: "complementary", merchant: "Restaurant" }),
    x(21, "Dinner with friends", 1400 + wiggle, "eating-out", { spendingType: "complementary", merchant: "Restaurant" }),
  ];
  const story: Spec[][] = [
    [x(12, "Python book", 4500, "books", { spendingType: "good_to_have", merchant: "Bookshop" })],
    [
      x(15, "Trail snacks and water", 2000, "hiking-food", { spendingType: "complementary", merchant: "Local grocery" }),
      x(17, "Snack run", 900, "eating-out", { spendingType: "impulse", notes: "Wasn't planned." }),
    ],
    [
      x(13, "Bus tickets to the trailhead", 2500, "hiking-trips", { spendingType: "complementary" }),
      x(16, "Cloud course", 8000, "courses", { spendingType: "good_to_have" }),
      x(19, "Bookshop browse", 2200, "books", { spendingType: "impulse", merchant: "Bookshop", notes: "Came in for one thing, left with three." }),
      inc(20, "Birthday gift", 5000, "gifts"),
    ],
    [
      x(10, "Trail boots", 6200, "hiking-gear", { spendingType: "good_to_have", merchant: "Decathlon" }),
      x(14, "Exam prep book", 3000, "books", { spendingType: "good_to_have", merchant: "Bookshop" }),
      inc(17, "Refund: returned backpack", 2400, "refunds", { notes: "Wrong size." }),
    ],
    [
      x(28, "Decathlon hiking outfit", 15600, "hiking-gear", {
        spendingType: "good_to_have",
        merchant: "Decathlon",
        notes: "Bought because my old hiking jacket is no longer waterproof.",
        items: [{ name: "Hiking jacket", dzd: 8500 }, { name: "Hiking pants", dzd: 5900 }, { name: "Hiking socks", dzd: 1200 }],
      }),
      x(12, "Practice test", 4500, "courses", { spendingType: "good_to_have" }),
      x(23, "Sunglasses", 3150, "personal", { spendingType: "impulse", notes: "Impulse purchase. Didn't originally plan to buy this." }),
    ],
  ];
  return [...list, ...story[i]];
}

/**
 * Example entries for a brand-new ledger, placed relative to `today` (YYYY-MM-DD) so the dashboard has a
 * live current month. In the current month, entries that would fall after today are moved back to today.
 */
export function buildDemoData(today: string): { categories: DemoCategory[]; transactions: DemoTransaction[] } {
  const currentMonth = today.slice(0, 7);
  const todayDay = Number(today.slice(8, 10));
  const transactions: DemoTransaction[] = [];

  for (let i = 0; i < 5; i++) {
    const month = shiftMonth(currentMonth, i - 4);
    const maxDay = month === currentMonth ? todayDay : lastDayOf(month);
    for (const s of monthSpecs(i)) {
      const day = Math.min(s.day, maxDay, lastDayOf(month));
      transactions.push({
        type: s.type,
        amount: Math.round(s.dzd * 100),
        date: `${month}-${String(day).padStart(2, "0")}`,
        description: s.description,
        categoryKey: s.categoryKey,
        ...(s.merchant && { merchant: s.merchant }),
        ...(s.spendingType && { spendingType: s.spendingType }),
        ...(s.notes && { notes: s.notes }),
        ...(s.items && { items: s.items.map((it) => ({ name: it.name, amount: Math.round(it.dzd * 100) })) }),
      });
    }
  }
  return { categories: DEMO_CATEGORIES, transactions };
}

/**
 * When example data is removed, keep any example category the user has since built on: one that a real
 * transaction uses, or that has a real sub-category. Its parent is kept too. Returns the ids to keep.
 */
export function categoriesToKeep(demoCats: { id: string; parentId?: string }[], realUsed: Set<string>, realChildParents: Set<string>): Set<string> {
  const isDemo = new Set(demoCats.map((c) => c.id));
  const keep = new Set([...realUsed, ...realChildParents].filter((id) => isDemo.has(id)));
  for (const c of demoCats) if (keep.has(c.id) && c.parentId) keep.add(c.parentId);
  return keep;
}

// ---------------------------------------------------------------- accounts, inventories and plans
export type DemoAccount = { key: string; name: string; kind: "cash" | "bank" | "savings"; target?: number };
export type DemoInventory = { month: string; asOf: string; notes?: string; balances: { accountKey: string; amount: number }[] };
export type DemoPlan = {
  month: string; expectedSpending: number; expectedIncome?: number; expectedSaving?: number; notes?: string;
  categories?: { categoryKey: string; amount: number }[];
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { key: "cash", name: "Cash", kind: "cash" },
  { key: "bank", name: "Bank account", kind: "bank" },
  { key: "savings", name: "Savings", kind: "savings", target: 10_000_000 }, // 100,000 DZD
];

/** Money that moved without an entry in each of the four closed months (minor units): the example for "unaccounted for". */
export const DEMO_UNEXPLAINED = [-185_000, -40_000, 0, -230_000];
const SAVED_PER_MONTH = 800_000;

/**
 * Five inventories (the starts of the last five months, each counted at the end of the month before) whose balances follow
 * from the example entries: bank moves with income and spending less what went to savings, savings gains a fixed amount,
 * and cash absorbs the "unaccounted" amounts. Plus a plan for each of the last four months.
 */
export function buildDemoPlanning(today: string, transactions: DemoTransaction[]) {
  const currentMonth = today.slice(0, 7);
  const keys = [-4, -3, -2, -1, 0].map((o) => shiftMonth(currentMonth, o));
  const asOfs = keys.map((k) => {
    const prev = shiftMonth(k, -1);
    return `${prev}-${String(lastDayOf(prev)).padStart(2, "0")}`;
  });
  const buckets = bucketEntries(transactions, asOfs);

  let cash = 1_200_000, bank = 6_000_000, savings = 3_500_000;
  const at = (i: number): DemoInventory => ({
    month: keys[i], asOf: asOfs[i],
    ...(i === 4 && { notes: "Counted the cash drawer too." }),
    balances: [{ accountKey: "cash", amount: cash }, { accountKey: "bank", amount: bank }, { accountKey: "savings", amount: savings }],
  });
  const inventories = [at(0)];
  for (let i = 1; i < keys.length; i++) {
    const b = buckets[i - 1];
    cash += DEMO_UNEXPLAINED[i - 1];
    savings += SAVED_PER_MONTH;
    bank += b.income - b.expenses - SAVED_PER_MONTH;
    inventories.push(at(i));
  }

  const plans: DemoPlan[] = [-3, -2, -1, 0].map((o, idx) => {
    const plan: DemoPlan = { month: shiftMonth(currentMonth, o), expectedSpending: [3_000_000, 2_800_000, 2_600_000, 3_000_000][idx], expectedIncome: 4_000_000, expectedSaving: SAVED_PER_MONTH };
    if (o === -1) plan.categories = [{ categoryKey: "groceries", amount: 1_100_000 }, { categoryKey: "hiking", amount: 500_000 }, { categoryKey: "education", amount: 300_000 }];
    if (o === 0) plan.categories = [{ categoryKey: "groceries", amount: 1_100_000 }, { categoryKey: "hiking", amount: 1_000_000 }, { categoryKey: "eating-out", amount: 400_000 }, { categoryKey: "education", amount: 500_000 }];
    return plan;
  });
  return { accounts: DEMO_ACCOUNTS, inventories, plans };
}

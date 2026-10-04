import { Types } from "mongoose";
import { Account } from "../models/Account";
import { Category } from "../models/Category";
import { Inventory } from "../models/Inventory";
import { Plan } from "../models/Plan";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { HttpError } from "../utils/httpError";
import { todayIn } from "./analytics.range";
import { buildDemoData, buildDemoPlanning, categoriesToKeep } from "./demo.data";

export async function demoStatus(userId: string) {
  const [demoTx, anyTx, anyInventory, anyPlan] = await Promise.all([
    Transaction.countDocuments({ userId, demo: true }),
    Transaction.countDocuments({ userId }),
    Inventory.countDocuments({ userId }),
    Plan.countDocuments({ userId }),
  ]);
  return { loaded: demoTx > 0, transactions: demoTx, canLoad: anyTx === 0 && anyInventory === 0 && anyPlan === 0 };
}

/**
 * Fills a ledger that has no entries, inventories or plans yet with clearly marked example data, so the app can be
 * explored straight away. Categories and accounts the person already made are reused where names match.
 */
export async function loadDemo(userId: string) {
  if (!(await demoStatus(userId)).canLoad) {
    throw new HttpError(409, "Example data can only be loaded before you record entries, inventories or plans of your own, so it never mixes with them.");
  }
  const user = await User.findById(userId).select("timezone");
  const { categories, transactions } = buildDemoData(todayIn(user?.timezone ?? "Africa/Algiers"));
  const planning = buildDemoPlanning(todayIn(user?.timezone ?? "Africa/Algiers"), transactions);
  const uid = new Types.ObjectId(userId);

  const slot = (kind: string, parentId: unknown, name: string) => `${kind}|${parentId ? String(parentId) : ""}|${name.trim().toLowerCase()}`;
  const mine = await Category.find({ userId, archived: { $ne: true } }).select("name kind parentId").lean();
  const existing = new Map(mine.map((c) => [slot(c.kind, c.parentId, c.name), c._id]));

  const ids = new Map<string, Types.ObjectId>();
  let created = 0;
  for (const level of [categories.filter((c) => !c.parentKey), categories.filter((c) => c.parentKey)]) {
    const fresh: { c: (typeof categories)[number]; parentId?: Types.ObjectId }[] = [];
    for (const c of level) {
      const parentId = c.parentKey ? ids.get(c.parentKey) : undefined;
      const reuse = existing.get(slot(c.kind, parentId, c.name));
      if (reuse) ids.set(c.key, reuse);
      else fresh.push({ c, parentId });
    }
    const docs = await Category.insertMany(fresh.map(({ c, parentId }) => ({ userId: uid, name: c.name, kind: c.kind, parentId, demo: true })));
    docs.forEach((d, i) => ids.set(fresh[i].c.key, d._id));
    created += docs.length;
  }
  await Transaction.insertMany(
    transactions.map((t) => ({
      userId: uid, type: t.type, amount: t.amount, date: new Date(`${t.date}T12:00:00Z`), description: t.description, merchant: t.merchant,
      categoryId: ids.get(t.categoryKey), spendingType: t.spendingType, notes: t.notes, items: t.items, demo: true,
    })),
  );

  // accounts: reuse the person's own where kind and name match
  const accountSlot = (kind: string, name: string) => `${kind}|${name.trim().toLowerCase()}`;
  const ownAccounts = await Account.find({ userId, archived: { $ne: true } }).select("name kind").lean();
  const existingAccounts = new Map(ownAccounts.map((a) => [accountSlot(a.kind, a.name), a._id]));
  const accountIds = new Map<string, Types.ObjectId>();
  const freshAccounts = planning.accounts.filter((a) => {
    const reuse = existingAccounts.get(accountSlot(a.kind, a.name));
    if (reuse) accountIds.set(a.key, reuse);
    return !reuse;
  });
  const madeAccounts = await Account.insertMany(freshAccounts.map((a) => ({ userId: uid, name: a.name, kind: a.kind, target: a.target, demo: true })));
  madeAccounts.forEach((d, i) => accountIds.set(freshAccounts[i].key, d._id));

  await Inventory.insertMany(
    planning.inventories.map((iv) => ({
      userId: uid, month: iv.month, asOf: new Date(`${iv.asOf}T12:00:00Z`), notes: iv.notes, demo: true,
      balances: iv.balances.map((b) => ({ accountId: accountIds.get(b.accountKey), amount: b.amount })),
    })),
  );
  await Plan.insertMany(
    planning.plans.map((p) => ({
      userId: uid, month: p.month, expectedSpending: p.expectedSpending, expectedIncome: p.expectedIncome, expectedSaving: p.expectedSaving, notes: p.notes, demo: true,
      categories: p.categories?.map((c) => ({ categoryId: ids.get(c.categoryKey), amount: c.amount })),
    })),
  );
  return { categories: created, transactions: transactions.length, inventories: planning.inventories.length, plans: planning.plans.length };
}

/** Removes example data. Anything the user has edited or built on stays. */
export async function removeDemo(userId: string) {
  const removedTx = await Transaction.deleteMany({ userId, demo: true });
  const removedInventories = await Inventory.deleteMany({ userId, demo: true });
  const removedPlans = await Plan.deleteMany({ userId, demo: true });

  // accounts: keep any example account that a real inventory counts
  const demoAccountIds = (await Account.find({ userId, demo: true }).select("_id").lean()).map((a) => a._id);
  const countedByReal: unknown[] = await Inventory.distinct("balances.accountId", { userId, "balances.accountId": { $in: demoAccountIds } });
  const keepAccounts = countedByReal.map((id) => new Types.ObjectId(String(id)));
  const removedAccounts = await Account.deleteMany({ userId, demo: true, _id: { $nin: keepAccounts } });
  await Account.updateMany({ userId, _id: { $in: keepAccounts } }, { $unset: { demo: 1 } });

  // categories: keep any example category a real entry or a real plan uses, or that has a real sub-category
  const demoCats = await Category.find({ userId, demo: true }).select("parentId").lean();
  const demoIds = demoCats.map((c) => c._id);
  const [usedByEntries, usedByPlans, realChildren] = await Promise.all([
    Transaction.distinct("categoryId", { userId, categoryId: { $in: demoIds } }),
    Plan.distinct("categories.categoryId", { userId, "categories.categoryId": { $in: demoIds } }),
    Category.distinct("parentId", { userId, demo: { $ne: true }, parentId: { $in: demoIds } }),
  ]);
  const keep = categoriesToKeep(
    demoCats.map((c) => ({ id: String(c._id), parentId: c.parentId ? String(c.parentId) : undefined })),
    new Set([...usedByEntries, ...usedByPlans].map(String)),
    new Set(realChildren.map(String)),
  );
  const keepIds = [...keep].map((id) => new Types.ObjectId(id));
  const removedCats = await Category.deleteMany({ userId, demo: true, _id: { $nin: keepIds } });
  await Category.updateMany({ userId, _id: { $in: keepIds } }, { $unset: { demo: 1 } });

  return {
    transactions: removedTx.deletedCount, categories: removedCats.deletedCount, kept: keep.size + keepAccounts.length,
    inventories: removedInventories.deletedCount, plans: removedPlans.deletedCount, accounts: removedAccounts.deletedCount,
  };
}

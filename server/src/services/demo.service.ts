import { Types } from "mongoose";
import { Category } from "../models/Category";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { HttpError } from "../utils/httpError";
import { todayIn } from "./analytics.range";
import { buildDemoData, categoriesToKeep } from "./demo.data";

export async function demoStatus(userId: string) {
  const [demoTx, anyTx] = await Promise.all([Transaction.countDocuments({ userId, demo: true }), Transaction.countDocuments({ userId })]);
  return { loaded: demoTx > 0, transactions: demoTx, canLoad: anyTx === 0 };
}

/**
 * Fills a ledger that has no entries yet with clearly marked example entries, so the app can be explored straight away.
 * Categories the person already made are reused where names match; the rest are created and marked as examples.
 */
export async function loadDemo(userId: string) {
  if (!(await demoStatus(userId)).canLoad) {
    throw new HttpError(409, "Example data can only be loaded before you record entries of your own, so it never mixes with them.");
  }
  const user = await User.findById(userId).select("timezone");
  const { categories, transactions } = buildDemoData(todayIn(user?.timezone ?? "Africa/Algiers"));
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
      userId: uid,
      type: t.type,
      amount: t.amount,
      date: new Date(`${t.date}T12:00:00Z`),
      description: t.description,
      merchant: t.merchant,
      categoryId: ids.get(t.categoryKey),
      spendingType: t.spendingType,
      notes: t.notes,
      items: t.items,
      demo: true,
    })),
  );
  return { categories: created, transactions: transactions.length };
}

/** Removes example entries. Anything the user has edited or built on stays. */
export async function removeDemo(userId: string) {
  const removedTx = await Transaction.deleteMany({ userId, demo: true });

  const demoCats = await Category.find({ userId, demo: true }).select("parentId").lean();
  const demoIds = demoCats.map((c) => c._id);
  const [usedBy, realChildren] = await Promise.all([
    Transaction.distinct("categoryId", { userId, categoryId: { $in: demoIds } }),
    Category.distinct("parentId", { userId, demo: { $ne: true }, parentId: { $in: demoIds } }),
  ]);
  const keep = categoriesToKeep(
    demoCats.map((c) => ({ id: String(c._id), parentId: c.parentId ? String(c.parentId) : undefined })),
    new Set(usedBy.map(String)),
    new Set(realChildren.map(String)),
  );
  const keepIds = [...keep].map((id) => new Types.ObjectId(id));
  const removedCats = await Category.deleteMany({ userId, demo: true, _id: { $nin: keepIds } });
  await Category.updateMany({ userId, _id: { $in: keepIds } }, { $unset: { demo: 1 } }); // kept: now the user's own

  return { transactions: removedTx.deletedCount, categories: removedCats.deletedCount, kept: keep.size };
}

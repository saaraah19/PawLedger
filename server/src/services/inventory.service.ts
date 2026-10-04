import { isValidObjectId, Types } from "mongoose";
import { Account } from "../models/Account";
import { Inventory } from "../models/Inventory";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { AccountInput, InventoryInput } from "../schemas/planning.schema";
import { HttpError } from "../utils/httpError";
import { todayIn } from "./analytics.range";
import { AccountLike, bucketEntries, InventoryLike, inventoryMonth, inventoryPrompt, reconcile, savingsSummary, totalOf } from "./inventory.logic";

const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const stored = (day: string) => new Date(`${day}T12:00:00Z`); // noon UTC, like transactions
async function userToday(userId: string) {
  const u = await User.findById(userId).select("timezone");
  return todayIn(u?.timezone ?? "Africa/Algiers");
}

// ---------------------------------------------------------------- accounts
// Every query filters by userId: accounts are private like everything else.
async function accountOwned(userId: string, id: string) {
  const doc = isValidObjectId(id) ? await Account.findOne({ _id: id, userId }) : null;
  if (!doc) throw new HttpError(404, "That account wasn't found.");
  return doc;
}

async function assertAccountNameFree(userId: string, name: string, excludeId?: string) {
  const clash = await Account.findOne({ userId, archived: false, name, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).collation({ locale: "en", strength: 2 });
  if (clash) throw new HttpError(409, `You already have an account called "${name}".`);
}

export async function listAccounts(userId: string) {
  const [docs, counts] = await Promise.all([
    Account.find({ userId }).sort({ name: 1 }),
    Inventory.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $unwind: "$balances" },
      { $group: { _id: "$balances.accountId", n: { $sum: 1 } } },
    ]),
  ]);
  const usage = new Map(counts.map((c) => [String(c._id), c.n]));
  return docs.map((d) => ({ ...d.toJSON(), usage: usage.get(String(d._id)) ?? 0 })); // usage: inventories that count it
}

export async function createAccount(userId: string, data: AccountInput) {
  await assertAccountNameFree(userId, data.name);
  return Account.create({ userId, name: data.name, kind: data.kind, target: data.target });
}

export async function updateAccount(userId: string, id: string, data: AccountInput) {
  const doc = await accountOwned(userId, id);
  if (!doc.archived) await assertAccountNameFree(userId, data.name, id);
  doc.set({ name: data.name, kind: data.kind, target: data.target }); // undefined unsets the target
  doc.demo = undefined; // an edited account is the user's own
  return doc.save();
}

export async function setAccountArchived(userId: string, id: string, archived: boolean) {
  const doc = await accountOwned(userId, id);
  if (!archived) await assertAccountNameFree(userId, doc.name, id);
  doc.archived = archived;
  return doc.save();
}

export async function deleteAccount(userId: string, id: string) {
  const doc = await accountOwned(userId, id);
  if ((await Inventory.countDocuments({ userId, "balances.accountId": doc._id })) > 0) {
    throw new HttpError(409, "This account has been counted in an inventory. Archive it instead; your history stays intact.");
  }
  await doc.deleteOne();
}

// ------------------------------------------------------------- inventories
async function checkAccounts(userId: string, ids: string[], alreadyIncluded: Set<string> = new Set()) {
  const found = await Account.find({ userId, _id: { $in: ids } });
  if (found.length !== ids.length) throw new HttpError(400, "One of those accounts doesn't exist.");
  const archived = found.find((a) => a.archived && !alreadyIncluded.has(String(a._id)));
  if (archived) throw new HttpError(400, `${archived.name} is archived. Restore it, or leave it out of this count.`);
}

async function inventoryOwned(userId: string, id: string) {
  const doc = isValidObjectId(id) ? await Inventory.findOne({ _id: id, userId }) : null;
  if (!doc) throw new HttpError(404, "That inventory wasn't found.");
  return doc;
}

export async function createInventory(userId: string, data: InventoryInput) {
  if (data.asOf > (await userToday(userId))) throw new HttpError(400, "You can't count money on a day that hasn't happened yet.");
  const month = inventoryMonth(data.asOf);
  if (await Inventory.exists({ userId, month })) {
    throw new HttpError(409, `You already took the inventory for the month starting ${month}. Edit that one instead.`);
  }
  await checkAccounts(userId, data.balances.map((b) => b.accountId));
  return Inventory.create({ userId, month, asOf: stored(data.asOf), balances: data.balances, notes: data.notes });
}

export async function updateInventory(userId: string, id: string, data: InventoryInput) {
  const doc = await inventoryOwned(userId, id);
  if (data.asOf > (await userToday(userId))) throw new HttpError(400, "You can't count money on a day that hasn't happened yet.");
  const month = inventoryMonth(data.asOf);
  if (month !== doc.month && (await Inventory.exists({ userId, month }))) {
    throw new HttpError(409, `You already took the inventory for the month starting ${month}.`);
  }
  await checkAccounts(userId, data.balances.map((b) => b.accountId), new Set(doc.balances.map((b) => String(b.accountId))));
  doc.set({ month, asOf: stored(data.asOf), balances: data.balances, notes: data.notes });
  doc.demo = undefined; // an edited inventory is the user's own
  return doc.save();
}

export async function deleteInventory(userId: string, id: string) {
  await (await inventoryOwned(userId, id)).deleteOne();
}

/** Everything the Inventory page shows, computed here: periods between counts, what the entries explain, savings. */
export async function computeOverview(userId: string, today: string) {
  const [accountDocs, invDocs] = await Promise.all([Account.find({ userId }).lean(), Inventory.find({ userId }).sort({ asOf: 1 }).lean()]);
  const accounts: AccountLike[] = accountDocs.map((a) => ({ id: String(a._id), name: a.name, kind: a.kind, target: a.target ?? null, archived: a.archived }));
  const invs: InventoryLike[] = invDocs.map((i) => ({
    id: String(i._id), month: i.month, asOf: dayOf(i.asOf), balances: i.balances.map((b) => ({ accountId: String(b.accountId), amount: b.amount })),
  }));

  let entries: { date: string; type: string; amount: number }[] = [];
  if (invs.length >= 2) {
    const rows = await Transaction.find({ userId, date: { $gt: invDocs[0].asOf, $lte: invDocs[invDocs.length - 1].asOf } }).select("date type amount").lean();
    entries = rows.map((r) => ({ date: dayOf(r.date), type: r.type, amount: r.amount }));
  }
  const periods = reconcile(invs, accounts, bucketEntries(entries, invs.map((i) => i.asOf)));
  return {
    accounts: accountDocs.map((a) => ({ id: String(a._id), name: a.name, kind: a.kind, target: a.target ?? null, archived: a.archived, demo: a.demo ?? false })),
    inventories: invDocs.map((i, k) => ({ ...invs[k], total: totalOf(invs[k].balances), notes: i.notes, demo: i.demo ?? false })),
    periods,
    savings: savingsSummary(accounts, invs, periods),
    prompt: inventoryPrompt(today, invs.map((i) => i.month)),
  };
}

export async function getOverview(userId: string) {
  return computeOverview(userId, await userToday(userId));
}

export async function getPrompt(userId: string) {
  const months: string[] = await Inventory.distinct("month", { userId });
  return { prompt: inventoryPrompt(await userToday(userId), months) };
}

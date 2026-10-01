import { isValidObjectId } from "mongoose";
import { Category } from "../models/Category";
import { Transaction } from "../models/Transaction";
import { ListQuery, TransactionInput } from "../schemas/transaction.schema";
import { HttpError } from "../utils/httpError";

const SORTS: Record<ListQuery["sort"], Record<string, 1 | -1>> = {
  newest: { date: -1, _id: -1 },
  oldest: { date: 1, _id: 1 },
  highest: { amount: -1, _id: -1 },
  lowest: { amount: 1, _id: 1 },
};

// Every query below filters by userId: one user can never read or change another's data.
async function findOwned(userId: string, id: string) {
  const doc = isValidObjectId(id) ? await Transaction.findOne({ _id: id, userId }) : null;
  if (!doc) throw new HttpError(404, "That transaction wasn't found.");
  return doc;
}

/** A category must exist, be the user's, match the transaction type, and (unless already in use) not be archived. */
async function assertCategoryUsable(userId: string, type: string, categoryId?: string, alreadyOnTransaction?: string) {
  if (!categoryId) return;
  const cat = await Category.findOne({ _id: categoryId, userId });
  if (!cat) throw new HttpError(400, "That category doesn't exist.");
  if (cat.kind !== type) throw new HttpError(400, `That is an ${cat.kind} category, so it can't be used for ${type}.`);
  if (cat.archived && categoryId !== alreadyOnTransaction) {
    throw new HttpError(400, "That category is archived. Restore it or choose another.");
  }
}

const fields = (d: TransactionInput) => ({
  type: d.type,
  amount: d.amount,
  date: d.date,
  description: d.description,
  merchant: d.merchant,
  categoryId: d.categoryId,
  spendingType: d.spendingType,
  notes: d.notes,
  items: d.items?.length ? d.items : undefined,
});

export async function createTransaction(userId: string, data: TransactionInput) {
  await assertCategoryUsable(userId, data.type, data.categoryId);
  return Transaction.create({ userId, ...fields(data) });
}

export async function listTransactions(userId: string, q: ListQuery) {
  const filter: Record<string, unknown> = { userId, ...(q.type ? { type: q.type } : {}) };
  if (q.categoryId) {
    // Filtering by a parent includes its sub-categories.
    const cat = await Category.findOne({ _id: q.categoryId, userId });
    const ids = cat ? [cat._id, ...(await Category.find({ userId, parentId: cat._id }).distinct("_id"))] : [];
    filter.categoryId = { $in: ids };
  }
  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit),
    Transaction.countDocuments(filter),
  ]);
  return { items, total, page: q.page, limit: q.limit, totalPages: Math.max(1, Math.ceil(total / q.limit)) };
}

export const getTransaction = (userId: string, id: string) => findOwned(userId, id);

export async function updateTransaction(userId: string, id: string, data: TransactionInput) {
  const doc = await findOwned(userId, id);
  await assertCategoryUsable(userId, data.type, data.categoryId, doc.categoryId ? String(doc.categoryId) : undefined);
  doc.set(fields(data)); // undefined values unset optional fields
  doc.demo = undefined; // an edited entry is the user's own, so removing example data won't touch it
  return doc.save();
}

export async function deleteTransaction(userId: string, id: string) {
  const doc = await findOwned(userId, id);
  await doc.deleteOne();
}

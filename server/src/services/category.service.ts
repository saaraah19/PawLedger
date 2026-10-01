import { isValidObjectId, Types } from "mongoose";
import { Category } from "../models/Category";
import { Transaction } from "../models/Transaction";
import { CreateCategoryInput, UpdateCategoryInput } from "../schemas/category.schema";
import { HttpError } from "../utils/httpError";
import { parentProblem } from "./category.rules";

// Every query filters by userId: categories are private like everything else.
async function findOwned(userId: string, id: string) {
  const doc = isValidObjectId(id) ? await Category.findOne({ _id: id, userId }) : null;
  if (!doc) throw new HttpError(404, "That category wasn't found.");
  return doc;
}

async function assertNameFree(userId: string, kind: string, parentId: string | undefined, name: string, excludeId?: string) {
  const clash = await Category.findOne({
    userId,
    kind,
    parentId: parentId ?? null,
    archived: false,
    name,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).collation({ locale: "en", strength: 2 }); // case-insensitive
  if (clash) throw new HttpError(409, `You already have a category called "${name}" here.`);
}

export async function listCategories(userId: string) {
  const [docs, counts] = await Promise.all([
    Category.find({ userId }).sort({ name: 1 }),
    Transaction.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { userId: new Types.ObjectId(userId), categoryId: { $exists: true } } },
      { $group: { _id: "$categoryId", n: { $sum: 1 } } },
    ]),
  ]);
  const usage = new Map(counts.map((c) => [String(c._id), c.n]));
  return docs.map((d) => ({ ...d.toJSON(), usage: usage.get(String(d._id)) ?? 0 }));
}

export async function createCategory(userId: string, data: CreateCategoryInput) {
  const parent = data.parentId ? await Category.findOne({ _id: data.parentId, userId }) : null;
  const problem = parentProblem({ parentId: data.parentId, parent, kind: data.kind, selfHasChildren: false, checkArchived: true });
  if (problem) throw new HttpError(400, problem);
  await assertNameFree(userId, data.kind, data.parentId, data.name);
  return Category.create({ userId, name: data.name, kind: data.kind, parentId: data.parentId });
}

export async function updateCategory(userId: string, id: string, data: UpdateCategoryInput) {
  const doc = await findOwned(userId, id);
  const parent = data.parentId ? await Category.findOne({ _id: data.parentId, userId }) : null;
  const selfHasChildren = (await Category.countDocuments({ userId, parentId: doc._id })) > 0;
  const parentChanged = String(doc.parentId ?? "") !== (data.parentId ?? "");
  const problem = parentProblem({
    parentId: data.parentId, selfId: id, parent, kind: doc.kind, selfHasChildren, checkArchived: parentChanged,
  });
  if (problem) throw new HttpError(400, problem);
  if (!doc.archived) await assertNameFree(userId, doc.kind, data.parentId, data.name, id);

  doc.demo = undefined; // an edited category is the user's own
  doc.name = data.name;
  doc.parentId = data.parentId ? new Types.ObjectId(data.parentId) : undefined;
  return doc.save();
}

export async function setArchived(userId: string, id: string, archived: boolean) {
  const doc = await findOwned(userId, id);
  if (!archived) {
    if (doc.parentId) {
      const parent = await Category.findOne({ _id: doc.parentId, userId });
      if (parent?.archived) throw new HttpError(409, "Restore the parent category first.");
    }
    await assertNameFree(userId, doc.kind, doc.parentId ? String(doc.parentId) : undefined, doc.name, id);
  }
  doc.archived = archived;
  await doc.save();
  // Archiving a parent archives its sub-categories, so nothing active hangs under an archived parent.
  if (archived) await Category.updateMany({ userId, parentId: doc._id }, { archived: true });
  return doc;
}

export async function deleteCategory(userId: string, id: string) {
  const doc = await findOwned(userId, id);
  const [used, children] = await Promise.all([
    Transaction.countDocuments({ userId, categoryId: doc._id }),
    Category.countDocuments({ userId, parentId: doc._id }),
  ]);
  if (used > 0 || children > 0) {
    throw new HttpError(409, "This category has transactions or sub-categories. Archive it instead; your history stays intact.");
  }
  await doc.deleteOne();
}

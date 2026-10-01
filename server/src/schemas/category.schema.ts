import { z } from "zod";
import { objectId } from "./common";

const name = z.string().trim().min(1, "Name the category").max(60, "Keep the name under 60 characters");

export const createCategoryBody = z.object({
  name,
  kind: z.enum(["expense", "income"]),
  parentId: objectId.optional(),
});

// PUT replaces name and placement: no parentId (or null) means top level. The kind never changes.
export const updateCategoryBody = z.object({
  name,
  parentId: objectId.nullish().transform((v) => v ?? undefined),
});

export const archiveBody = z.object({ archived: z.boolean() });

export type CreateCategoryInput = z.infer<typeof createCategoryBody>;
export type UpdateCategoryInput = z.infer<typeof updateCategoryBody>;

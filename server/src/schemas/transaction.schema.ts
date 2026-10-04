import { z } from "zod";
import { SPENDING_TYPES } from "../models/Transaction";
import { calendarDay, objectId, optText } from "./common";

const MAX_AMOUNT = 1_000_000_000_000; // minor units

const minor = z
  .number({ invalid_type_error: "Enter an amount" })
  .int("Amounts must be whole minor units")
  .positive("Amount must be more than zero")
  .max(MAX_AMOUNT, "That amount is too large");

// "YYYY-MM-DD" → noon UTC of that calendar day.
const dateOnly = calendarDay.transform((s) => new Date(`${s}T12:00:00Z`));

const item = z.object({
  name: z.string().trim().min(1, "Name each item").max(120),
  amount: minor, // line total, not unit price
  quantity: z.number().int().positive().max(999).optional(),
});

export const transactionBody = z
  .object({
    type: z.enum(["expense", "income"]),
    amount: minor,
    date: dateOnly,
    description: z.string().trim().min(1, "Describe the transaction").max(160),
    merchant: optText(120),
    categoryId: objectId.optional(),
    spendingType: z.enum(SPENDING_TYPES).optional(),
    notes: optText(2000),
    items: z.array(item).max(50).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "income" && (v.items?.length || v.spendingType || v.merchant)) {
      ctx.addIssue({ code: "custom", path: ["type"], message: "Only expenses have items, a store or a spending type" });
    }
    if (v.items?.length) {
      const sum = v.items.reduce((s, i) => s + i.amount, 0);
      if (sum !== v.amount) {
        ctx.addIssue({ code: "custom", path: ["items"], message: "The item amounts don't add up to the total" });
      }
    }
  });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["expense", "income"]).optional(),
  categoryId: objectId.optional(),
  sort: z.enum(["newest", "oldest", "highest", "lowest"]).default("newest"),
});

export type TransactionInput = z.infer<typeof transactionBody>;
export type ListQuery = z.infer<typeof listQuery>;

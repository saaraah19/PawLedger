import { z } from "zod";
import { ACCOUNT_KINDS } from "../models/Account";
import { calendarDay, objectId, optText } from "./common";

const MAX = 1_000_000_000_000; // minor units
const positive = z.number({ invalid_type_error: "Enter an amount" }).int("Amounts must be whole minor units").positive("Amount must be more than zero").max(MAX, "That amount is too large");
const signed = z.number({ invalid_type_error: "Enter an amount" }).int("Amounts must be whole minor units").min(-MAX, "That amount is too large").max(MAX, "That amount is too large");

export const monthParam = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the format YYYY-MM");

export const accountBody = z
  .object({
    name: z.string().trim().min(1, "Name the account").max(60, "Keep the name under 60 characters"),
    kind: z.enum(ACCOUNT_KINDS),
    target: positive.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.target !== undefined && v.kind !== "savings") ctx.addIssue({ code: "custom", path: ["target"], message: "Only savings accounts have a target" });
  });

export const inventoryBody = z
  .object({
    asOf: calendarDay,
    balances: z.array(z.object({ accountId: objectId, amount: signed })).min(1, "Enter at least one balance").max(50),
    notes: optText(1000),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.balances.map((b) => b.accountId)).size !== v.balances.length) {
      ctx.addIssue({ code: "custom", path: ["balances"], message: "Each account can only be counted once" });
    }
  });

export const planBody = z
  .object({
    expectedSpending: positive,
    expectedIncome: positive.optional(),
    expectedSaving: positive.optional(),
    categories: z.array(z.object({ categoryId: objectId, amount: positive })).max(40).optional(),
    notes: optText(1000),
  })
  .superRefine((v, ctx) => {
    const ids = (v.categories ?? []).map((c) => c.categoryId);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["categories"], message: "Each category can only appear once" });
  });

export const planQuery = z.object({ month: monthParam.optional() });

export type AccountInput = z.infer<typeof accountBody>;
export type InventoryInput = z.infer<typeof inventoryBody>;
export type PlanInput = z.infer<typeof planBody>;

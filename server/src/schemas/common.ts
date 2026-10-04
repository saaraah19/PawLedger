import { z } from "zod";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "That id isn't valid");

/** A real calendar day written YYYY-MM-DD (rejects 2026-02-30). */
export const calendarDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "That date doesn't exist");

/** Trimmed optional text; blank becomes undefined. */
export const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .optional()
    .transform((s) => (s ? s : undefined));

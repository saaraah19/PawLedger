import { z } from "zod";
import { MAX_MONTHS, monthIndex } from "../services/analytics.range";
import { calendarDay, objectId } from "./common";

export const summaryQuery = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the format YYYY-MM").optional(),
    from: calendarDay.optional(),
    to: calendarDay.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.month && (v.from || v.to)) ctx.addIssue({ code: "custom", message: "Use either month or from and to, not both" });
    if (Boolean(v.from) !== Boolean(v.to)) ctx.addIssue({ code: "custom", message: "Give both from and to" });
    if (v.from && v.to && v.from > v.to) ctx.addIssue({ code: "custom", message: "The start date is after the end date" });
  });

export type SummaryQuery = z.infer<typeof summaryQuery>;

// ---- month-range queries for Analyze ----

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use the format YYYY-MM");
const rangeFields = { from: month.optional(), to: month.optional() };
const checkRange = (v: { from?: string; to?: string }, ctx: z.RefinementCtx) => {
  if (Boolean(v.from) !== Boolean(v.to)) ctx.addIssue({ code: "custom", message: "Give both from and to" });
  if (v.from && v.to) {
    if (v.from > v.to) ctx.addIssue({ code: "custom", message: "The start month is after the end month" });
    else if (monthIndex(v.to) - monthIndex(v.from) + 1 > MAX_MONTHS) {
      ctx.addIssue({ code: "custom", message: `Choose a range of at most ${MAX_MONTHS / 12} years` });
    }
  }
};

export const monthsQuery = z.object(rangeFields).superRefine(checkRange);
export const trendQuery = z.object({ ...rangeFields, categoryId: objectId }).superRefine(checkRange);
export type MonthsQuery = z.infer<typeof monthsQuery>;
export type TrendQuery = z.infer<typeof trendQuery>;

// ---- Compare ----
const pk = ["a", "b"] as const;
const periodFields = { a: month.optional(), aFrom: calendarDay.optional(), aTo: calendarDay.optional(), b: month.optional(), bFrom: calendarDay.optional(), bTo: calendarDay.optional() };
type PeriodSpec = { month?: string; from?: string; to?: string };

/**
 * Two periods, each either a month (a=2026-07) or a range of days (aFrom/aTo). Sending neither period
 * asks for the default: last month compared with this month. Sending only one is an error.
 */
export const comparisonQuery = z
  .object(periodFields)
  .superRefine((v, ctx) => {
    if (Object.values(v).every((x) => x === undefined)) return;
    for (const [p, label] of [["a", "first"], ["b", "second"]] as const) {
      const m = v[p], from = v[`${p}From`], to = v[`${p}To`];
      if (m && (from || to)) ctx.addIssue({ code: "custom", message: `Use a month or a date range for the ${label} period, not both` });
      else if (!m && !(from && to)) ctx.addIssue({ code: "custom", message: `Choose the ${label} period` });
      else if (from && to && from > to) ctx.addIssue({ code: "custom", message: `The ${label} period starts after it ends` });
    }
  })
  .transform((v): { a?: PeriodSpec; b?: PeriodSpec } => {
    const spec = (p: (typeof pk)[number]): PeriodSpec | undefined => {
      const m = v[p], from = v[`${p}From`], to = v[`${p}To`];
      return m ? { month: m } : from && to ? { from, to } : undefined;
    };
    return { a: spec("a"), b: spec("b") };
  });
export type ComparisonQuery = z.infer<typeof comparisonQuery>;

// ---- Observations ----
export const observationsQuery = z.object({ month: month.optional() });
export type ObservationsQuery = z.infer<typeof observationsQuery>;

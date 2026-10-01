import { Request, Response } from "express";
import { comparisonQuery, monthsQuery, observationsQuery, summaryQuery, trendQuery } from "../schemas/analytics.schema";
import { getSummary } from "../services/analytics.service";
import { getBreakdown, getCategoryTrend, getComparison, getMonthly, getObservations } from "../services/analytics.trends.service";

export async function summary(req: Request, res: Response) {
  res.json(await getSummary(res.locals.userId, summaryQuery.parse(req.query)));
}

export async function monthly(req: Request, res: Response) {
  res.json(await getMonthly(res.locals.userId, monthsQuery.parse(req.query)));
}
export async function breakdown(req: Request, res: Response) {
  res.json(await getBreakdown(res.locals.userId, monthsQuery.parse(req.query)));
}
export async function categoryTrend(req: Request, res: Response) {
  res.json(await getCategoryTrend(res.locals.userId, trendQuery.parse(req.query)));
}
export async function comparison(req: Request, res: Response) {
  res.json(await getComparison(res.locals.userId, comparisonQuery.parse(req.query)));
}
export async function observations(req: Request, res: Response) {
  res.json(await getObservations(res.locals.userId, observationsQuery.parse(req.query)));
}

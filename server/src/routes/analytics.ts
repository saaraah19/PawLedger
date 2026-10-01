import { Router } from "express";
import { breakdown, categoryTrend, comparison, monthly, observations, summary } from "../controllers/analytics.controller";
import { requireAuth } from "../middleware/auth";

export const analyticsRoutes = Router();
analyticsRoutes.use(requireAuth);
analyticsRoutes.get("/summary", summary);
analyticsRoutes.get("/monthly", monthly);
analyticsRoutes.get("/breakdown", breakdown);
analyticsRoutes.get("/category-trend", categoryTrend);
analyticsRoutes.get("/comparison", comparison);
analyticsRoutes.get("/observations", observations);

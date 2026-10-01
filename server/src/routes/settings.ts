import { Router } from "express";
import { onboarded, update } from "../controllers/settings.controller";
import { requireAuth } from "../middleware/auth";

export const settingsRoutes = Router();
settingsRoutes.use(requireAuth);
settingsRoutes.put("/", update);
settingsRoutes.post("/onboarded", onboarded);

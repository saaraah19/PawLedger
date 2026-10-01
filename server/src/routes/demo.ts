import { Router } from "express";
import { load, remove, status } from "../controllers/demo.controller";
import { requireAuth } from "../middleware/auth";

export const demoRoutes = Router();
demoRoutes.use(requireAuth);
demoRoutes.get("/", status);
demoRoutes.post("/", load);
demoRoutes.delete("/", remove);

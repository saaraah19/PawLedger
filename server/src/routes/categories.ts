import { Router } from "express";
import { archive, create, list, remove, update } from "../controllers/category.controller";
import { requireAuth } from "../middleware/auth";

export const categoryRoutes = Router();
categoryRoutes.use(requireAuth);
categoryRoutes.get("/", list);
categoryRoutes.post("/", create);
categoryRoutes.put("/:id", update);
categoryRoutes.patch("/:id/archive", archive);
categoryRoutes.delete("/:id", remove);

import { Router } from "express";
import { accounts, inventories, plans } from "../controllers/planning.controller";
import { requireAuth } from "../middleware/auth";

export const accountRoutes = Router();
accountRoutes.use(requireAuth);
accountRoutes.get("/", accounts.list);
accountRoutes.post("/", accounts.create);
accountRoutes.put("/:id", accounts.update);
accountRoutes.patch("/:id/archive", accounts.archive);
accountRoutes.delete("/:id", accounts.remove);

export const inventoryRoutes = Router();
inventoryRoutes.use(requireAuth);
inventoryRoutes.get("/overview", inventories.overview); // fixed paths before "/:id"
inventoryRoutes.get("/prompt", inventories.prompt);
inventoryRoutes.post("/", inventories.create);
inventoryRoutes.put("/:id", inventories.update);
inventoryRoutes.delete("/:id", inventories.remove);

export const planRoutes = Router();
planRoutes.use(requireAuth);
planRoutes.get("/", plans.view);
planRoutes.put("/:month", plans.save);
planRoutes.delete("/:month", plans.remove);

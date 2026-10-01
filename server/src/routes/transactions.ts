import { Router } from "express";
import { create, get, list, remove, update } from "../controllers/transaction.controller";
import { requireAuth } from "../middleware/auth";

export const transactionRoutes = Router();
transactionRoutes.use(requireAuth);
transactionRoutes.post("/", create);
transactionRoutes.get("/", list);
transactionRoutes.get("/:id", get);
transactionRoutes.put("/:id", update);
transactionRoutes.delete("/:id", remove);

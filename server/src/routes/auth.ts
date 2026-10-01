import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { login, logout, me, register } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Wait a few minutes and try again." },
});

export const authRoutes = Router();
authRoutes.post("/register", limiter, register);
authRoutes.post("/login", limiter, login);
authRoutes.post("/logout", logout);
authRoutes.get("/me", requireAuth, me);
// Public and read-only: lets the sign-in page hide "create account" when registration is closed.
authRoutes.get("/config", (_req, res) => {
  res.json({ registrationOpen: env.ALLOW_REGISTRATION });
});

import { NextFunction, Request, Response } from "express";
import { readToken } from "../services/auth.service";
import { HttpError } from "../utils/httpError";

export const COOKIE_NAME = "token";

/** Puts the authenticated user's id on res.locals.userId. Every private route uses this. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new HttpError(401, "Please sign in to continue.");
  try {
    res.locals.userId = readToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }
  next();
}

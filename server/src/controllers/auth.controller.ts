import { CookieOptions, Request, Response } from "express";
import { z } from "zod";
import { env } from "../config/env";
import { COOKIE_NAME } from "../middleware/auth";
import { User } from "../models/User";
import { publicUser, registerUser, signToken, verifyLogin } from "../services/auth.service";
import { HttpError } from "../utils/httpError";

const email = z.string().trim().email("Enter a valid email").max(254);
const registerBody = z.object({ email, password: z.string().min(10, "Use at least 10 characters").max(128) });
const loginBody = z.object({ email, password: z.string().min(1, "Enter your password").max(128) });

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.COOKIE_SAMESITE,
  path: "/",
});

function startSession(res: Response, userId: string) {
  res.cookie(COOKIE_NAME, signToken(userId), { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export async function register(req: Request, res: Response) {
  const { email, password } = registerBody.parse(req.body);
  const user = await registerUser(email, password);
  startSession(res, String(user._id));
  res.status(201).json({ user: publicUser(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginBody.parse(req.body);
  const user = await verifyLogin(email, password);
  startSession(res, String(user._id));
  res.json({ user: publicUser(user) });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.status(204).end();
}

export async function me(_req: Request, res: Response) {
  const user = await User.findById(res.locals.userId);
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  res.json({ user: publicUser(user) });
}

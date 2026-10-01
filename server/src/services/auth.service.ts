import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/User";
import { HttpError } from "../utils/httpError";

const ROUNDS = 12;
// Compared against when the email is unknown, so both failure paths take similar time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", ROUNDS);

export function publicUser(u: { _id: unknown; email: string; currency?: string | null; timezone?: string | null; onboarded?: boolean | null }) {
  return {
    id: String(u._id),
    email: u.email,
    currency: u.currency ?? "DZD",
    timezone: u.timezone ?? "Africa/Algiers",
    onboarded: Boolean(u.onboarded),
  };
}

export async function registerUser(email: string, password: string) {
  if (!env.ALLOW_REGISTRATION) {
    throw new HttpError(403, "Registration is closed on this instance.");
  }
  if (await User.exists({ email: email.toLowerCase() })) {
    throw new HttpError(409, "An account with this email already exists.");
  }
  const passwordHash = await bcrypt.hash(password, ROUNDS);
  return User.create({ email, passwordHash });
}

export async function verifyLogin(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Email or password is incorrect.");
  return user;
}

export const signToken = (userId: string) =>
  jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "7d" });

export function readToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === "string" || !payload.sub) throw new Error("bad token");
  return String(payload.sub);
}

import { User } from "../models/User";
import { HttpError } from "../utils/httpError";
import { publicUser } from "./auth.service";

export async function updateSettings(userId: string, data: { currency: string; timezone: string }) {
  const user = await User.findByIdAndUpdate(userId, data, { new: true });
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return publicUser(user);
}

export async function completeOnboarding(userId: string) {
  const user = await User.findByIdAndUpdate(userId, { onboarded: true }, { new: true });
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return publicUser(user);
}

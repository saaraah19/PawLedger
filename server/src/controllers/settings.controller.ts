import { Request, Response } from "express";
import { settingsBody } from "../schemas/settings.schema";
import { completeOnboarding, updateSettings } from "../services/settings.service";

export async function update(req: Request, res: Response) {
  res.json({ user: await updateSettings(res.locals.userId, settingsBody.parse(req.body)) });
}

export async function onboarded(_req: Request, res: Response) {
  res.json({ user: await completeOnboarding(res.locals.userId) });
}

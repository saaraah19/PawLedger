import { Request, Response } from "express";
import * as svc from "../services/demo.service";

const uid = (res: Response): string => res.locals.userId;

export async function status(_req: Request, res: Response) {
  res.json(await svc.demoStatus(uid(res)));
}
export async function load(_req: Request, res: Response) {
  res.status(201).json(await svc.loadDemo(uid(res)));
}
export async function remove(_req: Request, res: Response) {
  res.json(await svc.removeDemo(uid(res)));
}

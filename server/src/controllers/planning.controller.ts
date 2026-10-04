import { Request, Response } from "express";
import { archiveBody } from "../schemas/category.schema";
import { accountBody, inventoryBody, monthParam, planBody, planQuery } from "../schemas/planning.schema";
import * as inv from "../services/inventory.service";
import * as plan from "../services/plan.service";

const uid = (res: Response): string => res.locals.userId;
const id = (req: Request) => String(req.params.id);

export const accounts = {
  list: async (_q: Request, res: Response) => void res.json({ accounts: await inv.listAccounts(uid(res)) }),
  create: async (req: Request, res: Response) => void res.status(201).json({ account: await inv.createAccount(uid(res), accountBody.parse(req.body)) }),
  update: async (req: Request, res: Response) => void res.json({ account: await inv.updateAccount(uid(res), id(req), accountBody.parse(req.body)) }),
  archive: async (req: Request, res: Response) => void res.json({ account: await inv.setAccountArchived(uid(res), id(req), archiveBody.parse(req.body).archived) }),
  remove: async (req: Request, res: Response) => { await inv.deleteAccount(uid(res), id(req)); res.status(204).end(); },
};

export const inventories = {
  overview: async (_q: Request, res: Response) => void res.json(await inv.getOverview(uid(res))),
  prompt: async (_q: Request, res: Response) => void res.json(await inv.getPrompt(uid(res))),
  create: async (req: Request, res: Response) => void res.status(201).json({ inventory: await inv.createInventory(uid(res), inventoryBody.parse(req.body)) }),
  update: async (req: Request, res: Response) => void res.json({ inventory: await inv.updateInventory(uid(res), id(req), inventoryBody.parse(req.body)) }),
  remove: async (req: Request, res: Response) => { await inv.deleteInventory(uid(res), id(req)); res.status(204).end(); },
};

export const plans = {
  view: async (req: Request, res: Response) => void res.json(await plan.getPlanView(uid(res), planQuery.parse(req.query).month)),
  save: async (req: Request, res: Response) => void res.json({ plan: await plan.upsertPlan(uid(res), monthParam.parse(req.params.month), planBody.parse(req.body)) }),
  remove: async (req: Request, res: Response) => { await plan.deletePlan(uid(res), monthParam.parse(req.params.month)); res.status(204).end(); },
};

import { Request, Response } from "express";
import { listQuery, transactionBody } from "../schemas/transaction.schema";
import * as svc from "../services/transaction.service";

const uid = (res: Response): string => res.locals.userId;

export async function create(req: Request, res: Response) {
  const tx = await svc.createTransaction(uid(res), transactionBody.parse(req.body));
  res.status(201).json({ transaction: tx });
}

export async function list(req: Request, res: Response) {
  res.json(await svc.listTransactions(uid(res), listQuery.parse(req.query)));
}

export async function get(req: Request, res: Response) {
  res.json({ transaction: await svc.getTransaction(uid(res), String(req.params.id)) });
}

export async function update(req: Request, res: Response) {
  const tx = await svc.updateTransaction(uid(res), String(req.params.id), transactionBody.parse(req.body));
  res.json({ transaction: tx });
}

export async function remove(req: Request, res: Response) {
  await svc.deleteTransaction(uid(res), String(req.params.id));
  res.status(204).end();
}

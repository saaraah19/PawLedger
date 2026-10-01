import { Request, Response } from "express";
import { archiveBody, createCategoryBody, updateCategoryBody } from "../schemas/category.schema";
import * as svc from "../services/category.service";

const uid = (res: Response): string => res.locals.userId;

export async function list(_req: Request, res: Response) {
  res.json({ categories: await svc.listCategories(uid(res)) });
}
export async function create(req: Request, res: Response) {
  res.status(201).json({ category: await svc.createCategory(uid(res), createCategoryBody.parse(req.body)) });
}
export async function update(req: Request, res: Response) {
  res.json({ category: await svc.updateCategory(uid(res), String(req.params.id), updateCategoryBody.parse(req.body)) });
}
export async function archive(req: Request, res: Response) {
  const { archived } = archiveBody.parse(req.body);
  res.json({ category: await svc.setArchived(uid(res), String(req.params.id), archived) });
}
export async function remove(req: Request, res: Response) {
  await svc.deleteCategory(uid(res), String(req.params.id));
  res.status(204).end();
}

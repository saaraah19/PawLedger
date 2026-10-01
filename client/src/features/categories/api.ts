import { api } from "../../lib/api";
import type { TxType } from "../transactions/api";

export type Category = {
  id: string;
  name: string;
  kind: TxType;
  parentId?: string;
  archived: boolean;
  usage: number; // transactions filed directly under it
  demo?: boolean; // example data; cleared when the category is edited
};

export const listCategories = () => api<{ categories: Category[] }>("/categories");
export const createCategory = (body: { name: string; kind: TxType; parentId?: string }) =>
  api("/categories", { method: "POST", body });
export const updateCategory = (id: string, body: { name: string; parentId?: string }) =>
  api(`/categories/${id}`, { method: "PUT", body });
export const setCategoryArchived = (id: string, archived: boolean) =>
  api(`/categories/${id}/archive`, { method: "PATCH", body: { archived } });
export const deleteCategory = (id: string) => api(`/categories/${id}`, { method: "DELETE" });

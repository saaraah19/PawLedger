import { api } from "../../lib/api";

export type DemoStatus = { loaded: boolean; transactions: number; canLoad: boolean };
export const getDemo = () => api<DemoStatus>("/demo");
export const loadDemo = () => api<{ categories: number; transactions: number }>("/demo", { method: "POST" });
export const removeDemo = () => api<{ transactions: number; categories: number; kept: number }>("/demo", { method: "DELETE" });

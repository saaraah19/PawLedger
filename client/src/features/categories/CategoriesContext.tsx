import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Category, listCategories } from "./api";

type Ctx = { categories: Category[]; loading: boolean; refresh: () => Promise<void> };
const CategoriesContext = createContext<Ctx | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setCategories((await listCategories()).categories);
    } catch {
      /* the Categories page shows its own error; pickers just stay as they were */
    }
  }, []);

  useEffect(() => {
    if (!user) return setCategories([]);
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [user?.id, refresh]);

  return <CategoriesContext.Provider value={{ categories, loading, refresh }}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories must be used inside CategoriesProvider");
  return ctx;
}

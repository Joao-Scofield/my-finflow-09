import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  defaultCategories,
  generateSeedTransactions,
  uid,
  type Category,
  type Subcategory,
  type Transaction,
} from "./finance-data";

const STORAGE_KEY = "finance-app:v1";

interface State {
  categories: Category[];
  transactions: Transaction[];
}

interface Ctx extends State {
  addTransaction: (t: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, t: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (c: Omit<Category, "id" | "subcategories">) => void;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id" | "subcategories">>) => void;
  deleteCategory: (id: string) => void;
  addSubcategory: (categoryId: string, name: string) => void;
  updateSubcategory: (categoryId: string, subId: string, name: string) => void;
  deleteSubcategory: (categoryId: string, subId: string) => void;
}

const FinanceContext = createContext<Ctx | null>(null);

function loadInitial(): State {
  if (typeof window === "undefined") {
    return { categories: defaultCategories, transactions: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // ignore
  }
  return { categories: defaultCategories, transactions: generateSeedTransactions() };
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => ({
    categories: defaultCategories,
    transactions: [],
  }));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadInitial());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, hydrated]);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      addTransaction: (t) =>
        setState((s) => ({ ...s, transactions: [{ ...t, id: uid() }, ...s.transactions] })),
      updateTransaction: (id, t) =>
        setState((s) => ({
          ...s,
          transactions: s.transactions.map((tx) => (tx.id === id ? { ...t, id } : tx)),
        })),
      deleteTransaction: (id) =>
        setState((s) => ({ ...s, transactions: s.transactions.filter((tx) => tx.id !== id) })),
      addCategory: (c) =>
        setState((s) => ({
          ...s,
          categories: [...s.categories, { ...c, id: uid(), subcategories: [] }],
        })),
      updateCategory: (id, patch) =>
        setState((s) => ({
          ...s,
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteCategory: (id) =>
        setState((s) => ({
          ...s,
          categories: s.categories.filter((c) => c.id !== id),
          transactions: s.transactions.filter((t) => t.categoryId !== id),
        })),
      addSubcategory: (categoryId, name) =>
        setState((s) => ({
          ...s,
          categories: s.categories.map((c) =>
            c.id === categoryId
              ? { ...c, subcategories: [...c.subcategories, { id: uid(), name }] }
              : c,
          ),
        })),
      updateSubcategory: (categoryId, subId, name) =>
        setState((s) => ({
          ...s,
          categories: s.categories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  subcategories: c.subcategories.map((sc) =>
                    sc.id === subId ? { ...sc, name } : sc,
                  ),
                }
              : c,
          ),
        })),
      deleteSubcategory: (categoryId, subId) =>
        setState((s) => ({
          ...s,
          categories: s.categories.map((c) =>
            c.id === categoryId
              ? { ...c, subcategories: c.subcategories.filter((sc) => sc.id !== subId) }
              : c,
          ),
          transactions: s.transactions.map((t) =>
            t.categoryId === categoryId && t.subcategoryId === subId
              ? { ...t, subcategoryId: undefined }
              : t,
          ),
        })),
    }),
    [state],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}

export type { Category, Subcategory, Transaction };

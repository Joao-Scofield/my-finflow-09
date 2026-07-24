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

export interface ImportRow {
  type: "income" | "expense";
  amount: number;
  date: string;
  description: string;
  categoryName: string;
  subcategoryName?: string;
  status: "paid" | "pending";
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
  importRows: (
    rows: ImportRow[],
    opts?: { replace?: boolean },
  ) => { added: number; categoriesCreated: number; subcategoriesCreated: number };
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
      importRows: (rows, opts) => {
        const stats = { added: 0, categoriesCreated: 0, subcategoriesCreated: 0 };
        const norm = (s: string) => s.trim().toLowerCase();
        const palette = [
          "#6366f1","#8b5cf6","#ec4899","#ef4444","#f59e0b",
          "#10b981","#14b8a6","#06b6d4","#0ea5e9","#a855f7","#f97316","#84cc16",
        ];
        setState((s) => {
          const categories = s.categories.map((c) => ({
            ...c,
            subcategories: [...c.subcategories],
          }));
          const findCat = (name: string, type: "income" | "expense") =>
            categories.find((c) => norm(c.name) === norm(name) && c.type === type);
          const newTx: Transaction[] = [];
          for (const r of rows) {
            let cat = findCat(r.categoryName, r.type);
            if (!cat) {
              cat = {
                id: uid(),
                name: r.categoryName.trim() || (r.type === "income" ? "Outras Receitas" : "Outras Despesas"),
                color: palette[categories.length % palette.length],
                icon: "Tag",
                type: r.type,
                subcategories: [],
              };
              categories.push(cat);
              stats.categoriesCreated++;
            }
            let subId: string | undefined;
            if (r.subcategoryName && r.subcategoryName.trim()) {
              let sub = cat.subcategories.find(
                (sc) => norm(sc.name) === norm(r.subcategoryName!),
              );
              if (!sub) {
                sub = { id: uid(), name: r.subcategoryName.trim() };
                cat.subcategories.push(sub);
                stats.subcategoriesCreated++;
              }
              subId = sub.id;
            }
            newTx.push({
              id: uid(),
              type: r.type,
              amount: r.amount,
              date: r.date,
              categoryId: cat.id,
              subcategoryId: subId,
              description: r.description,
              status: r.status,
            });
            stats.added++;
          }
          const transactions = opts?.replace ? newTx : [...newTx, ...s.transactions];
          return { categories, transactions };
        });
        return stats;
      },
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

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  defaultCategories,
  defaultRules,
  generateSeedTransactions,
  uid,
  type Category,
  type Rule,
  type Subcategory,
  type Transaction,
} from "./finance-data";

const STORAGE_KEY = "finance-app:v1";

interface State {
  categories: Category[];
  transactions: Transaction[];
  rules: Rule[];
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

export interface RuleMatchResult {
  categoryId: string;
  subcategoryId?: string;
  ruleId: string;
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
  addRule: (r: Omit<Rule, "id">) => void;
  updateRule: (id: string, patch: Partial<Omit<Rule, "id">>) => void;
  deleteRule: (id: string) => void;
  matchRule: (description: string) => RuleMatchResult | null;
  reapplyRulesAll: () => { updated: number };
}

const FinanceContext = createContext<Ctx | null>(null);

function loadInitial(): State {
  if (typeof window === "undefined") {
    return { categories: defaultCategories, transactions: [], rules: defaultRules };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      return {
        categories: parsed.categories ?? defaultCategories,
        transactions: parsed.transactions ?? [],
        rules: parsed.rules ?? defaultRules,
      };
    }
  } catch {
    // ignore
  }
  return {
    categories: defaultCategories,
    transactions: generateSeedTransactions(),
    rules: defaultRules,
  };
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchRuleFor(
  description: string,
  rules: Rule[],
  categories: Category[],
): RuleMatchResult | null {
  const desc = normalize(description);
  const sorted = [...rules]
    .filter((r) => r.enabled && r.keywords.length > 0)
    .sort((a, b) => b.priority - a.priority);
  for (const r of sorted) {
    const cat = categories.find((c) => c.id === r.categoryId);
    if (!cat) continue;
    if (r.keywords.some((kw) => kw.trim() && desc.includes(normalize(kw)))) {
      return { categoryId: r.categoryId, subcategoryId: r.subcategoryId, ruleId: r.id };
    }
  }
  return null;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => ({
    categories: defaultCategories,
    transactions: [],
    rules: defaultRules,
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
      addTransaction: (t) => {
        setState((s) => {
          // Apply rules if description matches and user didn't already pick a specific subcategory
          let tx = { ...t, id: uid() } as Transaction;
          const match = matchRuleFor(t.description, s.rules, s.categories);
          if (match) {
            const matchedCat = s.categories.find((c) => c.id === match.categoryId);
            // Only override when types are compatible
            if (matchedCat && matchedCat.type === t.type) {
              tx = { ...tx, categoryId: match.categoryId, subcategoryId: match.subcategoryId };
            }
          }
          return { ...s, transactions: [tx, ...s.transactions] };
        });
      },
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
          rules: s.rules.filter((r) => r.categoryId !== id),
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
          rules: s.rules.map((r) =>
            r.categoryId === categoryId && r.subcategoryId === subId
              ? { ...r, subcategoryId: undefined }
              : r,
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
            let subId: string | undefined;

            // If import didn't specify a category, try rules first
            const usedFallback = !r.categoryName || !r.categoryName.trim();
            if (usedFallback) {
              const match = matchRuleFor(r.description, s.rules, categories);
              if (match) {
                const mc = categories.find((c) => c.id === match.categoryId);
                if (mc && mc.type === r.type) {
                  cat = mc;
                  subId = match.subcategoryId;
                }
              }
            }

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
            if (!subId && r.subcategoryName && r.subcategoryName.trim()) {
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
          return { ...s, categories, transactions };
        });
        return stats;
      },
      addRule: (r) =>
        setState((s) => ({ ...s, rules: [...s.rules, { ...r, id: uid() }] })),
      updateRule: (id, patch) =>
        setState((s) => ({
          ...s,
          rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteRule: (id) =>
        setState((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) })),
      matchRule: (description) => matchRuleFor(description, state.rules, state.categories),
      reapplyRulesAll: () => {
        let updated = 0;
        setState((s) => {
          const transactions = s.transactions.map((t) => {
            const match = matchRuleFor(t.description, s.rules, s.categories);
            if (!match) return t;
            const cat = s.categories.find((c) => c.id === match.categoryId);
            if (!cat || cat.type !== t.type) return t;
            if (
              t.categoryId === match.categoryId &&
              t.subcategoryId === match.subcategoryId
            )
              return t;
            updated++;
            return { ...t, categoryId: match.categoryId, subcategoryId: match.subcategoryId };
          });
          return { ...s, transactions };
        });
        return { updated };
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

export type { Category, Rule, Subcategory, Transaction };

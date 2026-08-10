import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  defaultCategories,
  defaultRules,
  type Account,
  type AccountKind,
  type Category,
  type Recurring,
  type Rule,
  type Subcategory,
  type PaymentMethod,
  type Transaction,
  type TxType,
} from "./finance-data";

export interface ImportRow {
  type: "income" | "expense";
  amount: number;
  date: string;
  description: string;
  categoryName: string;
  subcategoryName?: string;
  status: "paid" | "pending";
  paymentMethod?: PaymentMethod;
}

export interface RuleMatchResult {
  categoryId: string;
  subcategoryId?: string;
  ruleId: string;
}

interface Profile {
  username: string;
  displayName: string;
}

interface Ctx {
  categories: Category[];
  recurrings: Recurring[];
  transactions: Transaction[];
  rules: Rule[];
  accounts: Account[];
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (id: string, t: Omit<Transaction, "id">) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (c: Omit<Category, "id" | "subcategories">) => Promise<void>;
  updateCategory: (
    id: string,
    patch: Partial<Omit<Category, "id" | "subcategories">>,
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addSubcategory: (categoryId: string, name: string) => Promise<void>;
  updateSubcategory: (categoryId: string, subId: string, name: string) => Promise<void>;
  deleteSubcategory: (categoryId: string, subId: string) => Promise<void>;
  importRows: (
    rows: ImportRow[],
    opts?: { replace?: boolean },
  ) => Promise<{ added: number; categoriesCreated: number; subcategoriesCreated: number }>;
  addAccount: (a: Omit<Account, "id" | "balance">) => Promise<void>;
  updateAccount: (id: string, patch: Partial<Omit<Account, "id" | "balance">>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addRule: (r: Omit<Rule, "id">) => Promise<void>;
  updateRule: (id: string, patch: Partial<Omit<Rule, "id">>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  addRecurring: (r: Omit<Recurring, "id">) => Promise<void>;
  updateRecurring: (id: string, patch: Partial<Omit<Recurring, "id">>) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  matchRule: (description: string) => RuleMatchResult | null;
  reapplyRulesAll: () => Promise<{ updated: number }>;
}

type CategoryRow = {
  color: string;
  icon: string;
  id: string;
  name: string;
  position: number;
  type: string;
};

type SubcategoryRow = {
  category_id: string;
  id: string;
  name: string;
  position: number;
};

type TransactionRow = {
  amount: number;
  category_id: string;
  description: string;
  id: string;
  status: string;
  subcategory_id: string | null;
  transaction_date: string;
  type: string;
  payment_method: string;
  account_id: string | null;
};

type AccountRow = {
  id: string;
  name: string;
  kind: string;
  balance: number;
  color: string;
  position: number;
};

type RecurringRow = {
  id: string;
  type: string;
  amount: number;
  description: string;
  category_id: string;
  subcategory_id: string | null;
  account_id: string | null;
  payment_method: string;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
};

type RuleRow = {
  category_id: string;
  enabled: boolean;
  id: string;
  keywords: string[];
  name: string;
  priority: number;
  subcategory_id: string | null;
};

const FinanceContext = createContext<Ctx | null>(null);
const defaultsPromises = new Map<string, Promise<void>>();

const palette = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#a855f7",
  "#f97316",
  "#84cc16",
];

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

function mapCategories(rows: CategoryRow[], subRows: SubcategoryRow[]): Category[] {
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      type: row.type as TxType,
      subcategories: subRows
        .filter((sub) => sub.category_id === row.id)
        .sort((a, b) => a.position - b.position)
        .map((sub) => ({ id: sub.id, name: sub.name })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function mapTransactions(rows: TransactionRow[]): Transaction[] {
  return rows.map((row) => ({
    id: row.id,
    type: row.type as TxType,
    amount: Number(row.amount),
    date: row.transaction_date,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? undefined,
    description: row.description,
    status: row.status as "paid" | "pending",
    paymentMethod: (row.payment_method ?? "outro") as PaymentMethod,
    accountId: row.account_id ?? undefined,
  }));
}

function mapAccounts(rows: AccountRow[]): Account[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind as AccountKind,
    initialBalance: Number(row.balance),
    balance: Number(row.balance),
    color: row.color,
  }));
}

/** saldo atual = saldo inicial + entradas - saídas lançadas naquela conta */
function withComputedBalances(accounts: Account[], transactions: Transaction[]): Account[] {
  const delta = new Map<string, number>();
  for (const t of transactions) {
    if (!t.accountId) continue;
    const current = delta.get(t.accountId) ?? 0;
    delta.set(t.accountId, current + (t.type === "income" ? t.amount : -t.amount));
  }
  return accounts.map((a) => ({
    ...a,
    balance: a.initialBalance + (delta.get(a.id) ?? 0),
  }));
}

function mapRecurrings(rows: RecurringRow[]): Recurring[] {
  return rows.map((row) => ({
    id: row.id,
    type: row.type as TxType,
    amount: Number(row.amount),
    description: row.description,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? undefined,
    accountId: row.account_id ?? undefined,
    paymentMethod: (row.payment_method ?? "outro") as PaymentMethod,
    dayOfMonth: row.day_of_month,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    active: row.active,
  }));
}

const RECURRING_SELECT =
  "id,type,amount,description,category_id,subcategory_id,account_id,payment_method,day_of_month,start_date,end_date,active";

const TRANSACTION_SELECT =
  "id,type,amount,transaction_date,category_id,subcategory_id,description,status,payment_method,account_id,recurring_id,recurring_month";

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** Gera os lançamentos mensais faltantes das recorrências ativas (do início até o mês atual). */
async function generateRecurringTransactions(
  userId: string,
  recurrings: Recurring[],
  existing: { recurring_id: string | null; recurring_month: string | null }[],
) {
  const done = new Set(
    existing
      .filter((t) => t.recurring_id && t.recurring_month)
      .map((t) => `${t.recurring_id}|${t.recurring_month}`),
  );
  const now = new Date();
  const lastIndex = now.getFullYear() * 12 + now.getMonth();
  const rows: {
    user_id: string;
    type: string;
    amount: number;
    transaction_date: string;
    category_id: string;
    subcategory_id: string | null;
    description: string;
    status: string;
    payment_method: string;
    account_id: string | null;
    recurring_id: string;
    recurring_month: string;
  }[] = [];

  for (const r of recurrings) {
    if (!r.active) continue;
    const [sy, sm] = r.startDate.split("-").map(Number);
    if (!sy || !sm) continue;
    let index = (sy as number) * 12 + ((sm as number) - 1);
    // limite de 24 meses retroativos para não gerar histórico infinito
    index = Math.max(index, lastIndex - 23);
    let endIndex = lastIndex;
    if (r.endDate) {
      const [ey, em] = r.endDate.split("-").map(Number);
      if (ey && em) endIndex = Math.min(endIndex, (ey as number) * 12 + ((em as number) - 1));
    }
    for (; index <= endIndex; index++) {
      const year = Math.floor(index / 12);
      const month = (index % 12) + 1;
      const key = monthKey(year, month);
      if (done.has(`${r.id}|${key}`)) continue;
      const day = Math.min(Math.max(r.dayOfMonth, 1), daysInMonth(year, month));
      rows.push({
        user_id: userId,
        type: r.type,
        amount: r.amount,
        transaction_date: `${key}-${String(day).padStart(2, "0")}`,
        category_id: r.categoryId,
        subcategory_id: r.subcategoryId ?? null,
        description: r.description,
        status: "paid",
        payment_method: r.paymentMethod,
        account_id: r.accountId ?? null,
        recurring_id: r.id,
        recurring_month: key,
      });
    }
  }

  if (rows.length === 0) return 0;
  const { error } = await supabase.from("finance_transactions").insert(rows);
  if (error) {
    console.error(error);
    return 0;
  }
  return rows.length;
}

function mapRules(rows: RuleRow[]): Rule[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    keywords: row.keywords,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? undefined,
    priority: row.priority,
    enabled: row.enabled,
  }));
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [recurrings, setRecurrings] = useState<Recurring[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const userId = await getCurrentUserId();
      await ensureDefaultsOnce(userId);

      const [
        profileResult,
        categoriesResult,
        subcategoriesResult,
        transactionsResult,
        rulesResult,
        accountsResult,
        recurringsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, display_name")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("finance_categories")
          .select("id,name,color,icon,type,position")
          .order("position"),
        supabase
          .from("finance_subcategories")
          .select("id,category_id,name,position")
          .order("position"),
        supabase
          .from("finance_transactions")
          .select(TRANSACTION_SELECT)
          .order("transaction_date", { ascending: false }),
        supabase
          .from("finance_rules")
          .select("id,name,keywords,category_id,subcategory_id,priority,enabled")
          .order("priority", { ascending: false }),
        supabase
          .from("finance_accounts")
          .select("id,name,kind,balance,color,position")
          .order("position"),
        supabase.from("finance_recurrings").select(RECURRING_SELECT).order("created_at"),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (subcategoriesResult.error) throw subcategoriesResult.error;
      if (transactionsResult.error) throw transactionsResult.error;
      if (rulesResult.error) throw rulesResult.error;
      if (accountsResult.error) throw accountsResult.error;
      if (recurringsResult.error) throw recurringsResult.error;

      setProfile(
        profileResult.data
          ? {
              username: profileResult.data.username,
              displayName: profileResult.data.display_name,
            }
          : null,
      );
      setCategories(
        mapCategories(
          categoriesResult.data as CategoryRow[],
          subcategoriesResult.data as SubcategoryRow[],
        ),
      );
      const recurringList = mapRecurrings(recurringsResult.data as RecurringRow[]);
      setRecurrings(recurringList);

      let transactionRows = transactionsResult.data as TransactionRow[];
      const generated = await generateRecurringTransactions(
        userId,
        recurringList,
        transactionsResult.data as {
          recurring_id: string | null;
          recurring_month: string | null;
        }[],
      );
      if (generated > 0) {
        const { data: refreshed } = await supabase
          .from("finance_transactions")
          .select(TRANSACTION_SELECT)
          .order("transaction_date", { ascending: false });
        if (refreshed) transactionRows = refreshed as TransactionRow[];
      }
      setTransactions(mapTransactions(transactionRows));
      setRules(mapRules(rulesResult.data as RuleRow[]));
      setAccounts(mapAccounts(accountsResult.data as AccountRow[]));
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar seus dados financeiros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function ensureDefaultsOnce(userId: string) {
    const running = defaultsPromises.get(userId);
    if (running) return running;

    const promise = ensureDefaults(userId).finally(() => defaultsPromises.delete(userId));
    defaultsPromises.set(userId, promise);
    return promise;
  }

  async function ensureDefaults(userId: string) {
    const [categoryCountResult, ruleCountResult] = await Promise.all([
      supabase
        .from("finance_categories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("finance_rules")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    if (categoryCountResult.error) throw categoryCountResult.error;
    if (ruleCountResult.error) throw ruleCountResult.error;

    // Usuário já inicializado: nada a semear (evita dezenas de upserts a cada carregamento).
    if ((categoryCountResult.count ?? 0) > 0 && (ruleCountResult.count ?? 0) > 0) return;

    const categoryIdMap = new Map<string, string>();
    const subcategoryIdMap = new Map<string, string>();

    for (const [index, category] of defaultCategories.entries()) {
      const { data: insertedCategory, error: categoryError } = await supabase
        .from("finance_categories")
        .upsert(
          {
            user_id: userId,
            name: category.name,
            color: category.color,
            icon: category.icon,
            type: category.type,
            position: index,
          },
          { onConflict: "user_id,type,name" },
        )
        .select("id")
        .single();
      if (categoryError) throw categoryError;
      categoryIdMap.set(category.id, insertedCategory.id);

      for (const [subIndex, subcategory] of category.subcategories.entries()) {
        const { data: insertedSubcategory, error: subcategoryError } = await supabase
          .from("finance_subcategories")
          .upsert(
            {
              user_id: userId,
              category_id: insertedCategory.id,
              name: subcategory.name,
              position: subIndex,
            },
            { onConflict: "category_id,name" },
          )
          .select("id")
          .single();
        if (subcategoryError) throw subcategoryError;
        subcategoryIdMap.set(subcategory.id, insertedSubcategory.id);
      }
    }

    if ((ruleCountResult.count ?? 0) === 0) {
      const seededRules = defaultRules
        .map((rule) => {
          const categoryId = categoryIdMap.get(rule.categoryId);
          if (!categoryId) return null;
          return {
            user_id: userId,
            name: rule.name,
            keywords: rule.keywords,
            category_id: categoryId,
            subcategory_id: rule.subcategoryId
              ? (subcategoryIdMap.get(rule.subcategoryId) ?? null)
              : null,
            priority: rule.priority,
            enabled: rule.enabled,
          };
        })
        .filter((rule): rule is NonNullable<typeof rule> => rule !== null);

      if (seededRules.length > 0) {
        const { error: rulesError } = await supabase.from("finance_rules").insert(seededRules);
        if (rulesError) throw rulesError;
      }
    }
  }

  const value = useMemo<Ctx>(
    () => ({
      categories,
      transactions,
      rules,
      recurrings,
      accounts: withComputedBalances(accounts, transactions),
      profile,
      refresh,
      loading,
      addTransaction: async (t) => {
        const userId = await getCurrentUserId();
        let tx = t;
        const match = matchRuleFor(t.description, rules, categories);
        if (match) {
          const matchedCat = categories.find((c) => c.id === match.categoryId);
          if (matchedCat && matchedCat.type === t.type) {
            tx = { ...tx, categoryId: match.categoryId, subcategoryId: match.subcategoryId };
          }
        }
        const { error } = await supabase.from("finance_transactions").insert({
          user_id: userId,
          type: tx.type,
          amount: tx.amount,
          transaction_date: tx.date,
          category_id: tx.categoryId,
          subcategory_id: tx.subcategoryId ?? null,
          description: tx.description,
          status: tx.status,
          payment_method: tx.paymentMethod,
          account_id: tx.accountId ?? null,
        });
        if (error) throw error;
        await refresh();
      },
      updateTransaction: async (id, t) => {
        const { error } = await supabase
          .from("finance_transactions")
          .update({
            type: t.type,
            amount: t.amount,
            transaction_date: t.date,
            category_id: t.categoryId,
            subcategory_id: t.subcategoryId ?? null,
            description: t.description,
            status: t.status,
            payment_method: t.paymentMethod,
            account_id: t.accountId ?? null,
          })
          .eq("id", id);
        if (error) throw error;
        await refresh();
      },
      deleteTransaction: async (id) => {
        const { error } = await supabase.from("finance_transactions").delete().eq("id", id);
        if (error) throw error;
        await refresh();
      },
      addCategory: async (c) => {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from("finance_categories").insert({
          user_id: userId,
          name: c.name,
          color: c.color,
          icon: c.icon,
          type: c.type,
          position: categories.length,
        });
        if (error) throw error;
        await refresh();
      },
      updateCategory: async (id, patch) => {
        const { error } = await supabase.from("finance_categories").update(patch).eq("id", id);
        if (error) throw error;
        await refresh();
      },
      deleteCategory: async (id) => {
        const { error } = await supabase.from("finance_categories").delete().eq("id", id);
        if (error) throw error;
        await refresh();
      },
      addSubcategory: async (categoryId, name) => {
        const userId = await getCurrentUserId();
        const category = categories.find((c) => c.id === categoryId);
        const { error } = await supabase.from("finance_subcategories").insert({
          user_id: userId,
          category_id: categoryId,
          name,
          position: category?.subcategories.length ?? 0,
        });
        if (error) throw error;
        await refresh();
      },
      updateSubcategory: async (_categoryId, subId, name) => {
        const { error } = await supabase
          .from("finance_subcategories")
          .update({ name })
          .eq("id", subId);
        if (error) throw error;
        await refresh();
      },
      deleteSubcategory: async (_categoryId, subId) => {
        const { error } = await supabase.from("finance_subcategories").delete().eq("id", subId);
        if (error) throw error;
        await refresh();
      },
      importRows: async (rows, opts) => {
        const userId = await getCurrentUserId();
        const stats = { added: 0, categoriesCreated: 0, subcategoriesCreated: 0 };
        const norm = (s: string) => s.trim().toLowerCase();
        const workingCategories = categories.map((c) => ({
          ...c,
          subcategories: [...c.subcategories],
        }));
        const newTransactions: Array<{
          user_id: string;
          type: "income" | "expense";
          amount: number;
          transaction_date: string;
          category_id: string;
          subcategory_id: string | null;
          description: string;
          status: "paid" | "pending";
          payment_method: string;
        }> = [];

        if (opts?.replace) {
          const { error } = await supabase
            .from("finance_transactions")
            .delete()
            .eq("user_id", userId);
          if (error) throw error;
        }

        for (const row of rows) {
          let cat = workingCategories.find(
            (c) => norm(c.name) === norm(row.categoryName) && c.type === row.type,
          );
          let subId: string | undefined;

          if (!cat) {
            const { data, error } = await supabase
              .from("finance_categories")
              .insert({
                user_id: userId,
                name:
                  row.categoryName.trim() ||
                  (row.type === "income" ? "Outras Receitas" : "Outras Despesas"),
                color: palette[workingCategories.length % palette.length],
                icon: "Tag",
                type: row.type,
                position: workingCategories.length,
              })
              .select("id,name,color,icon,type")
              .single();
            if (error) throw error;
            cat = { ...data, type: data.type as TxType, subcategories: [] };
            workingCategories.push(cat);
            stats.categoriesCreated++;
          }

          if (row.subcategoryName && row.subcategoryName.trim()) {
            let sub = cat.subcategories.find(
              (sc) => norm(sc.name) === norm(row.subcategoryName ?? ""),
            );
            if (!sub) {
              const { data, error } = await supabase
                .from("finance_subcategories")
                .insert({
                  user_id: userId,
                  category_id: cat.id,
                  name: row.subcategoryName.trim(),
                  position: cat.subcategories.length,
                })
                .select("id,name")
                .single();
              if (error) throw error;
              sub = data;
              cat.subcategories.push(sub);
              stats.subcategoriesCreated++;
            }
            subId = sub.id;
          } else {
            const match = matchRuleFor(row.description, rules, workingCategories);
            if (match) {
              const matchedCat = workingCategories.find((c) => c.id === match.categoryId);
              if (matchedCat && matchedCat.type === row.type) {
                cat = matchedCat;
                subId = match.subcategoryId;
              }
            }
          }

          newTransactions.push({
            user_id: userId,
            type: row.type,
            amount: row.amount,
            transaction_date: row.date,
            category_id: cat.id,
            subcategory_id: subId ?? null,
            description: row.description,
            status: row.status,
            payment_method: row.paymentMethod ?? "outro",
          });
          stats.added++;
        }

        if (newTransactions.length > 0) {
          const { error } = await supabase.from("finance_transactions").insert(newTransactions);
          if (error) throw error;
        }
        await refresh();
        return stats;
      },
      addAccount: async (a) => {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from("finance_accounts").insert({
          user_id: userId,
          name: a.name,
          kind: a.kind,
          balance: a.initialBalance,
          color: a.color,
          position: accounts.length,
        });
        if (error) throw error;
        await refresh();
      },
      updateAccount: async (id, patch) => {
        const payload = {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
          ...(patch.color !== undefined ? { color: patch.color } : {}),
          ...(patch.initialBalance !== undefined ? { balance: patch.initialBalance } : {}),
        };
        const { error } = await supabase.from("finance_accounts").update(payload).eq("id", id);
        if (error) throw error;
        await refresh();
      },
      deleteAccount: async (id) => {
        const { error } = await supabase.from("finance_accounts").delete().eq("id", id);
        if (error) throw error;
        await refresh();
      },
      addRule: async (r) => {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from("finance_rules").insert({
          user_id: userId,
          name: r.name,
          keywords: r.keywords,
          category_id: r.categoryId,
          subcategory_id: r.subcategoryId ?? null,
          priority: r.priority,
          enabled: r.enabled,
        });
        if (error) throw error;
        await refresh();
      },
      updateRule: async (id, patch) => {
        const payload = {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.keywords !== undefined ? { keywords: patch.keywords } : {}),
          ...(patch.categoryId !== undefined ? { category_id: patch.categoryId } : {}),
          ...(patch.subcategoryId !== undefined
            ? { subcategory_id: patch.subcategoryId ?? null }
            : {}),
          ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
          ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        };
        const { error } = await supabase.from("finance_rules").update(payload).eq("id", id);
        if (error) throw error;
        await refresh();
      },
      deleteRule: async (id) => {
        const { error } = await supabase.from("finance_rules").delete().eq("id", id);
        if (error) throw error;
        await refresh();
      },
      addRecurring: async (r) => {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from("finance_recurrings").insert({
          user_id: userId,
          type: r.type,
          amount: r.amount,
          description: r.description,
          category_id: r.categoryId,
          subcategory_id: r.subcategoryId ?? null,
          account_id: r.accountId ?? null,
          payment_method: r.paymentMethod,
          day_of_month: r.dayOfMonth,
          start_date: r.startDate,
          end_date: r.endDate ?? null,
          active: r.active,
        });
        if (error) throw error;
        await refresh();
      },
      updateRecurring: async (id, patch) => {
        const payload = {
          ...(patch.type !== undefined ? { type: patch.type } : {}),
          ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.categoryId !== undefined ? { category_id: patch.categoryId } : {}),
          ...(patch.subcategoryId !== undefined
            ? { subcategory_id: patch.subcategoryId ?? null }
            : {}),
          ...(patch.accountId !== undefined ? { account_id: patch.accountId ?? null } : {}),
          ...(patch.paymentMethod !== undefined ? { payment_method: patch.paymentMethod } : {}),
          ...(patch.dayOfMonth !== undefined ? { day_of_month: patch.dayOfMonth } : {}),
          ...(patch.startDate !== undefined ? { start_date: patch.startDate } : {}),
          ...(patch.endDate !== undefined ? { end_date: patch.endDate ?? null } : {}),
          ...(patch.active !== undefined ? { active: patch.active } : {}),
        };
        const { error } = await supabase.from("finance_recurrings").update(payload).eq("id", id);
        if (error) throw error;
        await refresh();
      },
      deleteRecurring: async (id) => {
        const { error } = await supabase.from("finance_recurrings").delete().eq("id", id);
        if (error) throw error;
        await refresh();
      },
      matchRule: (description) => matchRuleFor(description, rules, categories),
      reapplyRulesAll: async () => {
        let updated = 0;
        for (const transaction of transactions) {
          const match = matchRuleFor(transaction.description, rules, categories);
          if (!match) continue;
          const cat = categories.find((c) => c.id === match.categoryId);
          if (!cat || cat.type !== transaction.type) continue;
          if (
            transaction.categoryId === match.categoryId &&
            transaction.subcategoryId === match.subcategoryId
          ) {
            continue;
          }
          const { error } = await supabase
            .from("finance_transactions")
            .update({
              category_id: match.categoryId,
              subcategory_id: match.subcategoryId ?? null,
            })
            .eq("id", transaction.id);
          if (error) throw error;
          updated++;
        }
        if (updated > 0) await refresh();
        return { updated };
      },
    }),
    [accounts, categories, loading, profile, recurrings, refresh, rules, transactions],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}

export type { Account, Category, Rule, Subcategory, Transaction };

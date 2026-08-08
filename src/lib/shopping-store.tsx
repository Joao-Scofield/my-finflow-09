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
import { useFinance } from "@/lib/finance-store";
import type { PaymentMethod } from "@/lib/finance-data";
import type { ShoppingItem, ShoppingPriority, ShoppingStatus } from "@/lib/shopping-data";

export interface PurchasePosting {
  post: boolean;
  amount: number;
  date: string;
  accountId?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
}

interface Ctx {
  items: ShoppingItem[];
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (i: Omit<ShoppingItem, "id" | "transactionId" | "status" | "purchasedAt">) => Promise<void>;
  updateItem: (
    id: string,
    patch: Partial<Omit<ShoppingItem, "id" | "transactionId">>,
  ) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  markPurchased: (id: string, posting: PurchasePosting) => Promise<void>;
  unmarkPurchased: (id: string) => Promise<void>;
}

const ShoppingContext = createContext<Ctx | null>(null);

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

/** Garante uma categoria de despesa "Compras" quando o usuário não escolheu uma. */
async function ensureShoppingCategory(userId: string) {
  const existing = await supabase
    .from("finance_categories")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "expense")
    .eq("name", "Compras")
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id;

  const created = await supabase
    .from("finance_categories")
    .insert({
      user_id: userId,
      name: "Compras",
      color: "#a855f7",
      icon: "ShoppingBag",
      type: "expense",
    })
    .select("id")
    .single();
  if (created.error) throw created.error;
  return created.data.id;
}

const SELECT =
  "id,name,estimated_amount,url,store,quantity,priority,category_id,notes,status,purchased_at,transaction_id,position";

export function ShoppingProvider({ children }: { children: ReactNode }) {
  const { refresh: refreshFinance } = useFinance();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await getCurrentUserId();
      const { data, error } = await supabase
        .from("shopping_items")
        .select(SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(
        (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          estimatedAmount: Number(row.estimated_amount),
          url: row.url,
          store: row.store,
          quantity: Number(row.quantity),
          priority: row.priority as ShoppingPriority,
          categoryId: row.category_id ?? undefined,
          notes: row.notes,
          status: row.status as ShoppingStatus,
          purchasedAt: row.purchased_at ?? undefined,
          transactionId: row.transaction_id ?? undefined,
        })),
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar a lista de compras.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<Ctx>(
    () => ({
      items,
      loading,
      refresh,
      addItem: async (i) => {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from("shopping_items").insert({
          user_id: userId,
          name: i.name,
          estimated_amount: i.estimatedAmount,
          url: i.url,
          store: i.store,
          quantity: i.quantity,
          priority: i.priority,
          category_id: i.categoryId ?? null,
          notes: i.notes,
        });
        if (error) throw error;
        await refresh();
      },
      updateItem: async (id, patch) => {
        const { error } = await supabase
          .from("shopping_items")
          .update({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.estimatedAmount !== undefined
              ? { estimated_amount: patch.estimatedAmount }
              : {}),
            ...(patch.url !== undefined ? { url: patch.url } : {}),
            ...(patch.store !== undefined ? { store: patch.store } : {}),
            ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
            ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
            ...(patch.categoryId !== undefined ? { category_id: patch.categoryId ?? null } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
            ...(patch.purchasedAt !== undefined ? { purchased_at: patch.purchasedAt ?? null } : {}),
          })
          .eq("id", id);
        if (error) throw error;
        await refresh();
      },
      deleteItem: async (id) => {
        const item = items.find((x) => x.id === id);
        if (item?.transactionId) {
          await supabase.from("finance_transactions").delete().eq("id", item.transactionId);
          await refreshFinance();
        }
        const { error } = await supabase.from("shopping_items").delete().eq("id", id);
        if (error) throw error;
        await refresh();
      },
      markPurchased: async (id, posting) => {
        const userId = await getCurrentUserId();
        const item = items.find((x) => x.id === id);
        if (!item) return;

        let transactionId: string | null = null;
        if (posting.post && posting.amount > 0) {
          const categoryId =
            posting.categoryId ?? item.categoryId ?? (await ensureShoppingCategory(userId));
          const created = await supabase
            .from("finance_transactions")
            .insert({
              user_id: userId,
              type: "expense",
              amount: posting.amount,
              transaction_date: posting.date,
              category_id: categoryId,
              description: item.name,
              status: "paid",
              payment_method: posting.paymentMethod ?? "outro",
              account_id: posting.accountId ?? null,
            })
            .select("id")
            .single();
          if (created.error) throw created.error;
          transactionId = created.data.id;
        }

        const { error } = await supabase
          .from("shopping_items")
          .update({
            status: "comprado",
            purchased_at: posting.date,
            transaction_id: transactionId,
          })
          .eq("id", id);
        if (error) throw error;
        await Promise.all([refresh(), transactionId ? refreshFinance() : Promise.resolve()]);
      },
      unmarkPurchased: async (id) => {
        const item = items.find((x) => x.id === id);
        if (item?.transactionId) {
          await supabase.from("finance_transactions").delete().eq("id", item.transactionId);
          await refreshFinance();
        }
        const { error } = await supabase
          .from("shopping_items")
          .update({ status: "desejado", purchased_at: null, transaction_id: null })
          .eq("id", id);
        if (error) throw error;
        await refresh();
      },
    }),
    [items, loading, refresh, refreshFinance],
  );

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>;
}

export function useShopping() {
  const ctx = useContext(ShoppingContext);
  if (!ctx) throw new Error("useShopping deve ser usado dentro de ShoppingProvider");
  return ctx;
}

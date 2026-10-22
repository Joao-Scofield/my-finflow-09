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
import { nextMonthDate, type Bill, type BillStatus } from "@/lib/bills-data";

export type BillInput = Omit<Bill, "id" | "status" | "paidAt">;

interface Ctx {
  bills: Bill[];
  loading: boolean;
  refresh: () => Promise<void>;
  addBill: (b: BillInput) => Promise<void>;
  updateBill: (id: string, patch: Partial<BillInput>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  markPaid: (id: string, date: string) => Promise<void>;
  unmarkPaid: (id: string) => Promise<void>;
}

const BillsContext = createContext<Ctx | null>(null);

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

async function ensureBillsCategory(userId: string) {
  const existing = await supabase
    .from("finance_categories")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "expense")
    .eq("name", "Contas")
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id;

  const created = await supabase
    .from("finance_categories")
    .insert({
      user_id: userId,
      name: "Contas",
      color: "#6366f1",
      icon: "Receipt",
      type: "expense",
    })
    .select("id")
    .single();
  if (created.error) throw created.error;
  return created.data.id;
}

const SELECT =
  "id,name,amount,due_date,recurring,notify_days_before,category_id,account_id,payment_method,notes,status,paid_at";

export function BillsProvider({ children }: { children: ReactNode }) {
  const { refresh: refreshFinance } = useFinance();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await getCurrentUserId();
      const { data, error } = await supabase
        .from("finance_bills")
        .select(SELECT)
        .order("due_date", { ascending: true });
      if (error) throw error;
      setBills(
        (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          amount: Number(row.amount),
          dueDate: row.due_date,
          recurring: row.recurring,
          notifyDaysBefore: Number(row.notify_days_before),
          categoryId: row.category_id ?? undefined,
          accountId: row.account_id ?? undefined,
          paymentMethod: row.payment_method as PaymentMethod,
          notes: row.notes,
          status: row.status as BillStatus,
          paidAt: row.paid_at ?? undefined,
        })),
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar as contas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<Ctx>(
    () => ({
      bills,
      loading,
      refresh,
      addBill: async (b) => {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from("finance_bills").insert({
          user_id: userId,
          name: b.name,
          amount: b.amount,
          due_date: b.dueDate,
          recurring: b.recurring,
          notify_days_before: b.notifyDaysBefore,
          category_id: b.categoryId ?? null,
          account_id: b.accountId ?? null,
          payment_method: b.paymentMethod,
          notes: b.notes,
        });
        if (error) throw error;
        await refresh();
      },
      updateBill: async (id, patch) => {
        const { error } = await supabase
          .from("finance_bills")
          .update({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
            ...(patch.dueDate !== undefined
              ? { due_date: patch.dueDate, last_notified_for: null }
              : {}),
            ...(patch.recurring !== undefined ? { recurring: patch.recurring } : {}),
            ...(patch.notifyDaysBefore !== undefined
              ? { notify_days_before: patch.notifyDaysBefore }
              : {}),
            ...(patch.categoryId !== undefined ? { category_id: patch.categoryId ?? null } : {}),
            ...(patch.accountId !== undefined ? { account_id: patch.accountId ?? null } : {}),
            ...(patch.paymentMethod !== undefined ? { payment_method: patch.paymentMethod } : {}),
            ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
          })
          .eq("id", id);
        if (error) throw error;
        await refresh();
      },
      deleteBill: async (id) => {
        const { error } = await supabase.from("finance_bills").delete().eq("id", id);
        if (error) throw error;
        await refresh();
      },
      markPaid: async (id, date) => {
        const userId = await getCurrentUserId();
        const bill = bills.find((b) => b.id === id);
        if (!bill) return;

        const categoryId = bill.categoryId ?? (await ensureBillsCategory(userId));
        const created = await supabase
          .from("finance_transactions")
          .insert({
            user_id: userId,
            type: "expense",
            amount: bill.amount,
            transaction_date: date,
            category_id: categoryId,
            description: bill.name,
            status: "paid",
            payment_method: bill.paymentMethod,
            account_id: bill.accountId ?? null,
          })
          .select("id")
          .single();
        if (created.error) throw created.error;

        const { error } = await supabase
          .from("finance_bills")
          .update({ status: "paid", paid_at: date, transaction_id: created.data.id })
          .eq("id", id);
        if (error) throw error;

        if (bill.recurring) {
          const next = await supabase.from("finance_bills").insert({
            user_id: userId,
            name: bill.name,
            amount: bill.amount,
            due_date: nextMonthDate(bill.dueDate),
            recurring: true,
            notify_days_before: bill.notifyDaysBefore,
            category_id: bill.categoryId ?? null,
            account_id: bill.accountId ?? null,
            payment_method: bill.paymentMethod,
            notes: bill.notes,
          });
          if (next.error) throw next.error;
        }

        await Promise.all([refresh(), refreshFinance()]);
      },
      unmarkPaid: async (id) => {
        const current = await supabase
          .from("finance_bills")
          .select("transaction_id")
          .eq("id", id)
          .maybeSingle();
        if (current.data?.transaction_id) {
          await supabase.from("finance_transactions").delete().eq("id", current.data.transaction_id);
        }
        const { error } = await supabase
          .from("finance_bills")
          .update({ status: "pending", paid_at: null, transaction_id: null })
          .eq("id", id);
        if (error) throw error;
        await Promise.all([refresh(), refreshFinance()]);
      },
    }),
    [bills, loading, refresh, refreshFinance],
  );

  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>;
}

export function useBills() {
  const ctx = useContext(BillsContext);
  if (!ctx) throw new Error("useBills deve ser usado dentro de BillsProvider");
  return ctx;
}

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
import type {
  FixedCost,
  FixedCostKind,
  FuelType,
  Fueling,
  Maintenance,
  MaintenanceKind,
  Periodicity,
  Vehicle,
} from "@/lib/fleet-data";

export interface FinancePosting {
  post: boolean;
  accountId?: string;
  paymentMethod?: PaymentMethod;
}

interface Ctx {
  vehicles: Vehicle[];
  fuelings: Fueling[];
  maintenances: Maintenance[];
  fixedCosts: FixedCost[];
  loading: boolean;
  refresh: () => Promise<void>;
  addVehicle: (v: Omit<Vehicle, "id">) => Promise<void>;
  updateVehicle: (id: string, patch: Partial<Omit<Vehicle, "id">>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addFueling: (f: Omit<Fueling, "id" | "transactionId">, posting: FinancePosting) => Promise<void>;
  deleteFueling: (id: string) => Promise<void>;
  addMaintenance: (
    m: Omit<Maintenance, "id" | "transactionId">,
    posting: FinancePosting,
  ) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;
  addFixedCost: (
    c: Omit<FixedCost, "id" | "transactionId">,
    posting: FinancePosting,
  ) => Promise<void>;
  deleteFixedCost: (id: string) => Promise<void>;
}

const FleetContext = createContext<Ctx | null>(null);

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

/** Garante a categoria de despesa "Frota" e a subcategoria informada. */
async function ensureFleetCategory(userId: string, subName: string) {
  const existing = await supabase
    .from("finance_categories")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "expense")
    .eq("name", "Frota")
    .maybeSingle();
  if (existing.error) throw existing.error;

  let categoryId = existing.data?.id;
  if (!categoryId) {
    const created = await supabase
      .from("finance_categories")
      .insert({ user_id: userId, name: "Frota", color: "#0ea5e9", icon: "Car", type: "expense" })
      .select("id")
      .single();
    if (created.error) throw created.error;
    categoryId = created.data.id;
  }

  const sub = await supabase
    .from("finance_subcategories")
    .select("id")
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .eq("name", subName)
    .maybeSingle();
  if (sub.error) throw sub.error;

  let subcategoryId = sub.data?.id;
  if (!subcategoryId) {
    const createdSub = await supabase
      .from("finance_subcategories")
      .insert({ user_id: userId, category_id: categoryId, name: subName })
      .select("id")
      .single();
    if (createdSub.error) throw createdSub.error;
    subcategoryId = createdSub.data.id;
  }

  return { categoryId, subcategoryId };
}

async function createFleetExpense(
  userId: string,
  input: { date: string; amount: number; description: string; subName: string },
  posting: FinancePosting,
) {
  if (!posting.post || input.amount <= 0) return null;
  const { categoryId, subcategoryId } = await ensureFleetCategory(userId, input.subName);
  const { data, error } = await supabase
    .from("finance_transactions")
    .insert({
      user_id: userId,
      type: "expense",
      amount: input.amount,
      transaction_date: input.date,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      description: input.description,
      status: "paid",
      payment_method: posting.paymentMethod ?? "outro",
      account_id: posting.accountId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function removeLinkedTransaction(transactionId?: string | null) {
  if (!transactionId) return;
  await supabase.from("finance_transactions").delete().eq("id", transactionId);
}

export function FleetProvider({ children }: { children: ReactNode }) {
  const { refresh: refreshFinance } = useFinance();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelings, setFuelings] = useState<Fueling[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await getCurrentUserId();
      const [v, f, m, c] = await Promise.all([
        supabase
          .from("fleet_vehicles")
          .select("id,name,plate,brand_model,year,fuel_type,initial_odometer,color,position")
          .order("position"),
        supabase
          .from("fleet_fuelings")
          .select(
            "id,vehicle_id,fueling_date,odometer,liters,total_amount,fuel_type,station,full_tank,notes,transaction_id",
          )
          .order("fueling_date", { ascending: false }),
        supabase
          .from("fleet_maintenances")
          .select(
            "id,vehicle_id,maintenance_date,odometer,kind,description,amount,next_odometer,transaction_id",
          )
          .order("maintenance_date", { ascending: false }),
        supabase
          .from("fleet_fixed_costs")
          .select("id,vehicle_id,name,kind,amount,periodicity,start_date,end_date,transaction_id")
          .order("created_at"),
      ]);

      if (v.error) throw v.error;
      if (f.error) throw f.error;
      if (m.error) throw m.error;
      if (c.error) throw c.error;

      setVehicles(
        (v.data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          plate: row.plate,
          brandModel: row.brand_model,
          year: row.year ?? undefined,
          fuelType: row.fuel_type as FuelType,
          initialOdometer: Number(row.initial_odometer),
          color: row.color,
        })),
      );
      setFuelings(
        (f.data ?? []).map((row) => ({
          id: row.id,
          vehicleId: row.vehicle_id,
          date: row.fueling_date,
          odometer: Number(row.odometer),
          liters: Number(row.liters),
          totalAmount: Number(row.total_amount),
          fuelType: row.fuel_type as FuelType,
          station: row.station,
          fullTank: row.full_tank,
          notes: row.notes,
          transactionId: row.transaction_id ?? undefined,
        })),
      );
      setMaintenances(
        (m.data ?? []).map((row) => ({
          id: row.id,
          vehicleId: row.vehicle_id,
          date: row.maintenance_date,
          odometer: Number(row.odometer),
          kind: row.kind as MaintenanceKind,
          description: row.description,
          amount: Number(row.amount),
          nextOdometer: row.next_odometer == null ? undefined : Number(row.next_odometer),
          transactionId: row.transaction_id ?? undefined,
        })),
      );
      setFixedCosts(
        (c.data ?? []).map((row) => ({
          id: row.id,
          vehicleId: row.vehicle_id,
          name: row.name,
          kind: row.kind as FixedCostKind,
          amount: Number(row.amount),
          periodicity: row.periodicity as Periodicity,
          startDate: row.start_date,
          endDate: row.end_date ?? undefined,
          transactionId: row.transaction_id ?? undefined,
        })),
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível carregar os dados da frota.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<Ctx>(
    () => ({
      vehicles,
      fuelings,
      maintenances,
      fixedCosts,
      loading,
      refresh,
      addVehicle: async (v) => {
        const userId = await getCurrentUserId();
        const { error } = await supabase.from("fleet_vehicles").insert({
          user_id: userId,
          name: v.name,
          plate: v.plate,
          brand_model: v.brandModel,
          year: v.year ?? null,
          fuel_type: v.fuelType,
          initial_odometer: v.initialOdometer,
          color: v.color,
          position: vehicles.length,
        });
        if (error) throw error;
        await refresh();
      },
      updateVehicle: async (id, patch) => {
        const { error } = await supabase
          .from("fleet_vehicles")
          .update({
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.plate !== undefined ? { plate: patch.plate } : {}),
            ...(patch.brandModel !== undefined ? { brand_model: patch.brandModel } : {}),
            ...(patch.year !== undefined ? { year: patch.year ?? null } : {}),
            ...(patch.fuelType !== undefined ? { fuel_type: patch.fuelType } : {}),
            ...(patch.initialOdometer !== undefined
              ? { initial_odometer: patch.initialOdometer }
              : {}),
            ...(patch.color !== undefined ? { color: patch.color } : {}),
          })
          .eq("id", id);
        if (error) throw error;
        await refresh();
      },
      deleteVehicle: async (id) => {
        const { error } = await supabase.from("fleet_vehicles").delete().eq("id", id);
        if (error) throw error;
        await refresh();
      },
      addFueling: async (f, posting) => {
        const userId = await getCurrentUserId();
        const transactionId = await createFleetExpense(
          userId,
          {
            date: f.date,
            amount: f.totalAmount,
            description: `Abastecimento${f.station ? ` — ${f.station}` : ""}`,
            subName: "Combustível",
          },
          posting,
        );
        const { error } = await supabase.from("fleet_fuelings").insert({
          user_id: userId,
          vehicle_id: f.vehicleId,
          fueling_date: f.date,
          odometer: f.odometer,
          liters: f.liters,
          total_amount: f.totalAmount,
          fuel_type: f.fuelType,
          station: f.station,
          full_tank: f.fullTank,
          notes: f.notes,
          transaction_id: transactionId,
        });
        if (error) throw error;
        await refresh();
        if (transactionId) await refreshFinance();
      },
      deleteFueling: async (id) => {
        const row = fuelings.find((f) => f.id === id);
        const { error } = await supabase.from("fleet_fuelings").delete().eq("id", id);
        if (error) throw error;
        await removeLinkedTransaction(row?.transactionId);
        await refresh();
        if (row?.transactionId) await refreshFinance();
      },
      addMaintenance: async (m, posting) => {
        const userId = await getCurrentUserId();
        const transactionId = await createFleetExpense(
          userId,
          {
            date: m.date,
            amount: m.amount,
            description: m.description || "Manutenção do veículo",
            subName: "Manutenção",
          },
          posting,
        );
        const { error } = await supabase.from("fleet_maintenances").insert({
          user_id: userId,
          vehicle_id: m.vehicleId,
          maintenance_date: m.date,
          odometer: m.odometer,
          kind: m.kind,
          description: m.description,
          amount: m.amount,
          next_odometer: m.nextOdometer ?? null,
          transaction_id: transactionId,
        });
        if (error) throw error;
        await refresh();
        if (transactionId) await refreshFinance();
      },
      deleteMaintenance: async (id) => {
        const row = maintenances.find((m) => m.id === id);
        const { error } = await supabase.from("fleet_maintenances").delete().eq("id", id);
        if (error) throw error;
        await removeLinkedTransaction(row?.transactionId);
        await refresh();
        if (row?.transactionId) await refreshFinance();
      },
      addFixedCost: async (c, posting) => {
        const userId = await getCurrentUserId();
        const transactionId = await createFleetExpense(
          userId,
          {
            date: c.startDate,
            amount: c.amount,
            description: c.name,
            subName: "Custos fixos",
          },
          posting,
        );
        const { error } = await supabase.from("fleet_fixed_costs").insert({
          user_id: userId,
          vehicle_id: c.vehicleId,
          name: c.name,
          kind: c.kind,
          amount: c.amount,
          periodicity: c.periodicity,
          start_date: c.startDate,
          end_date: c.endDate ?? null,
          transaction_id: transactionId,
        });
        if (error) throw error;
        await refresh();
        if (transactionId) await refreshFinance();
      },
      deleteFixedCost: async (id) => {
        const row = fixedCosts.find((c) => c.id === id);
        const { error } = await supabase.from("fleet_fixed_costs").delete().eq("id", id);
        if (error) throw error;
        await removeLinkedTransaction(row?.transactionId);
        await refresh();
        if (row?.transactionId) await refreshFinance();
      },
    }),
    [vehicles, fuelings, maintenances, fixedCosts, loading, refresh, refreshFinance],
  );

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

export function useFleet() {
  const ctx = useContext(FleetContext);
  if (!ctx) throw new Error("useFleet must be used within FleetProvider");
  return ctx;
}

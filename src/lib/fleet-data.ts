export type FuelType = "gasolina" | "etanol" | "diesel" | "gnv" | "flex" | "eletrico";

export const fuelTypes: { value: FuelType; label: string }[] = [
  { value: "gasolina", label: "Gasolina" },
  { value: "etanol", label: "Etanol" },
  { value: "diesel", label: "Diesel" },
  { value: "gnv", label: "GNV" },
  { value: "flex", label: "Flex" },
  { value: "eletrico", label: "Elétrico" },
];

export const fuelTypeLabel = (v: string) => fuelTypes.find((f) => f.value === v)?.label ?? "Outro";

export type MaintenanceKind = "revisao" | "oleo" | "pneus" | "freios" | "eletrica" | "funilaria" | "outro";

export const maintenanceKinds: { value: MaintenanceKind; label: string }[] = [
  { value: "revisao", label: "Revisão" },
  { value: "oleo", label: "Troca de óleo" },
  { value: "pneus", label: "Pneus" },
  { value: "freios", label: "Freios" },
  { value: "eletrica", label: "Elétrica" },
  { value: "funilaria", label: "Funilaria / Pintura" },
  { value: "outro", label: "Outro" },
];

export const maintenanceKindLabel = (v: string) =>
  maintenanceKinds.find((m) => m.value === v)?.label ?? "Outro";

export type FixedCostKind = "ipva" | "seguro" | "licenciamento" | "financiamento" | "estacionamento" | "outro";

export const fixedCostKinds: { value: FixedCostKind; label: string }[] = [
  { value: "ipva", label: "IPVA" },
  { value: "seguro", label: "Seguro" },
  { value: "licenciamento", label: "Licenciamento" },
  { value: "financiamento", label: "Financiamento / Parcela" },
  { value: "estacionamento", label: "Estacionamento" },
  { value: "outro", label: "Outro" },
];

export const fixedCostKindLabel = (v: string) =>
  fixedCostKinds.find((f) => f.value === v)?.label ?? "Outro";

export type Periodicity = "mensal" | "anual" | "unico";

export const periodicities: { value: Periodicity; label: string }[] = [
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
  { value: "unico", label: "Único" },
];

export const periodicityLabel = (v: string) =>
  periodicities.find((p) => p.value === v)?.label ?? "Único";

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  brandModel: string;
  year?: number;
  fuelType: FuelType;
  initialOdometer: number;
  color: string;
}

export interface Fueling {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  liters: number;
  totalAmount: number;
  fuelType: FuelType;
  station: string;
  fullTank: boolean;
  notes: string;
  transactionId?: string;
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  kind: MaintenanceKind;
  description: string;
  amount: number;
  nextOdometer?: number;
  transactionId?: string;
}

export interface FixedCost {
  id: string;
  vehicleId: string;
  name: string;
  kind: FixedCostKind;
  amount: number;
  periodicity: Periodicity;
  startDate: string;
  endDate?: string;
  transactionId?: string;
}

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatKm = (v: number) =>
  `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km`;

export const fleetPalette = [
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#0ea5e9",
  "#84cc16",
  "#a855f7",
  "#ef4444",
];

/** Custo fixo rateado dentro de um mês específico (yyyy-mm) */
export function fixedCostForMonth(cost: FixedCost, year: number, month: number): number {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const start = new Date(`${cost.startDate}T00:00:00`);
  const end = cost.endDate ? new Date(`${cost.endDate}T00:00:00`) : null;
  if (start > monthEnd) return 0;
  if (end && end < monthStart) return 0;

  if (cost.periodicity === "mensal") return cost.amount;
  if (cost.periodicity === "anual") return cost.amount / 12;
  // único: entra apenas no mês do lançamento
  return start.getFullYear() === year && start.getMonth() + 1 === month ? cost.amount : 0;
}

/**
 * Estatísticas de consumo por veículo a partir dos abastecimentos.
 * km rodados = maior odômetro - menor odômetro registrado (ou odômetro inicial).
 */
export function fuelStats(fuelings: Fueling[], initialOdometer: number) {
  const sorted = [...fuelings].sort((a, b) => a.odometer - b.odometer);
  const liters = sorted.reduce((s, f) => s + f.liters, 0);
  const spent = sorted.reduce((s, f) => s + f.totalAmount, 0);
  if (sorted.length === 0) {
    return { km: 0, liters: 0, spent: 0, kmPerLiter: 0, lastOdometer: initialOdometer };
  }
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const baseOdometer = Math.min(initialOdometer || first.odometer, first.odometer);
  const km = Math.max(0, last.odometer - baseOdometer);

  let kmPerLiter = 0;
  if (sorted.length >= 2) {
    // litros usados para rodar: desconsidera o último abastecimento (tanque ainda não consumido)
    const litersUsed = sorted.slice(0, -1).reduce((s, f) => s + f.liters, 0);
    const kmBetween = Math.max(0, last.odometer - first.odometer);
    if (litersUsed > 0 && kmBetween > 0) kmPerLiter = kmBetween / litersUsed;
  }
  // com um único abastecimento (ou dados insuficientes), usa o odômetro inicial do veículo
  if (kmPerLiter === 0 && liters > 0 && km > 0) kmPerLiter = km / liters;

  return { km, liters, spent, kmPerLiter, lastOdometer: last.odometer };
}


import {
  fixedCostForMonth,
  type FixedCost,
  type Fueling,
  type Maintenance,
  type Vehicle,
} from "@/lib/fleet-data";

/**
 * Km rodados no mês. Usa como base o último odômetro anterior ao mês; se não
 * houver abastecimento anterior, cai para o odômetro inicial do veículo.
 */
export function kmInMonth(fuelings: Fueling[], year: number, month: number, initialOdometer = 0) {
  const inMonth = fuelings
    .filter((f) => {
      const [y, m] = f.date.split("-").map(Number);
      return y === year && m === month;
    })
    .sort((a, b) => a.odometer - b.odometer);
  if (inMonth.length === 0) return 0;
  const before = fuelings
    .filter((f) => f.date < `${year}-${String(month).padStart(2, "0")}-01`)
    .sort((a, b) => b.odometer - a.odometer)[0];
  const first = inMonth[0];
  const base = before
    ? before.odometer
    : initialOdometer > 0 && initialOdometer <= first.odometer
      ? initialOdometer
      : first.odometer;
  return Math.max(0, inMonth[inMonth.length - 1].odometer - base);
}

/** Soma dos km rodados no mês, calculados veículo a veículo. */
export function kmInMonthForVehicles(
  vehicles: Vehicle[],
  fuelings: Fueling[],
  year: number,
  month: number,
) {
  if (vehicles.length === 0) return kmInMonth(fuelings, year, month);
  return vehicles.reduce(
    (sum, v) =>
      sum +
      kmInMonth(
        fuelings.filter((f) => f.vehicleId === v.id),
        year,
        month,
        v.initialOdometer,
      ),
    0,
  );
}

export function costInMonth(
  fuelings: Fueling[],
  maintenances: Maintenance[],
  fixedCosts: FixedCost[],
  year: number,
  month: number,
) {
  const match = (d: string) => {
    const [y, m] = d.split("-").map(Number);
    return y === year && m === month;
  };
  const fuel = fuelings.filter((f) => match(f.date)).reduce((s, f) => s + f.totalAmount, 0);
  const maint = maintenances.filter((m) => match(m.date)).reduce((s, m) => s + m.amount, 0);
  const fixed = fixedCosts.reduce((s, c) => s + fixedCostForMonth(c, year, month), 0);
  return { fuel, maint, fixed, total: fuel + maint + fixed };
}

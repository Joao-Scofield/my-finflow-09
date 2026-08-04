import {
  fixedCostForMonth,
  type FixedCost,
  type Fueling,
  type Maintenance,
} from "@/lib/fleet-data";

export function kmInMonth(fuelings: Fueling[], year: number, month: number) {
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
  const base = before ? before.odometer : inMonth[0].odometer;
  return Math.max(0, inMonth[inMonth.length - 1].odometer - base);
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

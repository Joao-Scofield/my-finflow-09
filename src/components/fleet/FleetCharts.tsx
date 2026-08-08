import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFleet } from "@/lib/fleet-store";
import {
  fixedCostForMonth,
  formatBRL,
  type FixedCost,
  type Fueling,
  type Maintenance,
  type Vehicle,
} from "@/lib/fleet-data";
import { monthNamesPt } from "@/lib/finance-data";
import { costInMonth, kmInMonth, kmInMonthForVehicles } from "@/lib/fleet-metrics";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
} as const;

const axisTick = { fill: "var(--muted-foreground)" } as const;

export function CostPerKmChart({
  month,
  year,
  vehicle,
}: {
  month: number;
  year: number;
  vehicle: Vehicle | null;
}) {
  const { vehicles, fuelings, maintenances, fixedCosts } = useFleet();

  const data = useMemo(() => {
    const f = vehicle ? fuelings.filter((x) => x.vehicleId === vehicle.id) : fuelings;
    const m = vehicle ? maintenances.filter((x) => x.vehicleId === vehicle.id) : maintenances;
    const c = vehicle ? fixedCosts.filter((x) => x.vehicleId === vehicle.id) : fixedCosts;
    const arr: { name: string; "Custo/km": number; km: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(year, month - 1 - i, 1);
      const y = dt.getFullYear();
      const mm = dt.getMonth() + 1;
      const km = vehicle
        ? kmInMonth(f, y, mm, vehicle.initialOdometer)
        : kmInMonthForVehicles(vehicles, fuelings, y, mm);
      const { total } = costInMonth(f, m, c, y, mm);
      arr.push({
        name: `${monthNamesPt[mm - 1].slice(0, 3)}/${String(y).slice(2)}`,
        "Custo/km": km > 0 ? Number((total / km).toFixed(2)) : 0,
        km,
      });
    }
    return arr;
  }, [vehicles, fuelings, maintenances, fixedCosts, month, year, vehicle]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Custo por km (últimos 6 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tick={axisTick} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tick={axisTick} />
              <Tooltip formatter={(v: number) => formatBRL(Number(v))} contentStyle={tooltipStyle} itemStyle={{ color: "var(--popover-foreground)" }} labelStyle={{ color: "var(--popover-foreground)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value: string) => (
                <span style={{ color: "var(--foreground)" }}>{value}</span>
              )} />
              <Line
                type="monotone"
                dataKey="Custo/km"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function CostCompositionChart({
  month,
  year,
  vehicle,
}: {
  month: number;
  year: number;
  vehicle: Vehicle | null;
}) {
  const { fuelings, maintenances, fixedCosts } = useFleet();

  const data = useMemo(() => {
    const f = vehicle ? fuelings.filter((x) => x.vehicleId === vehicle.id) : fuelings;
    const m = vehicle ? maintenances.filter((x) => x.vehicleId === vehicle.id) : maintenances;
    const c = vehicle ? fixedCosts.filter((x) => x.vehicleId === vehicle.id) : fixedCosts;
    const { fuel, maint, fixed } = costInMonth(f, m, c, year, month);
    return [
      { name: "Combustível", value: Number(fuel.toFixed(2)), color: "var(--chart-2)" },
      { name: "Manutenção", value: Number(maint.toFixed(2)), color: "var(--chart-4)" },
      { name: "Custos fixos", value: Number(fixed.toFixed(2)), color: "var(--chart-5)" },
    ].filter((d) => d.value > 0);
  }, [fuelings, maintenances, fixedCosts, month, year, vehicle]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Composição dos custos do mês</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="grid h-[280px] place-items-center text-sm text-muted-foreground">
            Sem custos neste período.
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(Number(v))} contentStyle={tooltipStyle} itemStyle={{ color: "var(--popover-foreground)" }} labelStyle={{ color: "var(--popover-foreground)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value: string) => (
                <span style={{ color: "var(--foreground)" }}>{value}</span>
              )} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function VehicleComparisonChart({ month, year }: { month: number; year: number }) {
  const { vehicles, fuelings, maintenances, fixedCosts } = useFleet();

  const data = useMemo(
    () =>
      vehicles.map((v) => {
        const f = fuelings.filter((x) => x.vehicleId === v.id);
        const m = maintenances.filter((x) => x.vehicleId === v.id);
        const c = fixedCosts.filter((x) => x.vehicleId === v.id);
        const km = kmInMonth(f, year, month);
        const { total } = costInMonth(f, m, c, year, month);
        return {
          name: v.name,
          "Custo total": Number(total.toFixed(2)),
          "Custo/km": km > 0 ? Number((total / km).toFixed(2)) : 0,
        };
      }),
    [vehicles, fuelings, maintenances, fixedCosts, month, year],
  );

  if (vehicles.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparativo entre veículos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tick={axisTick} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tick={axisTick} />
              <Tooltip formatter={(v: number) => formatBRL(Number(v))} contentStyle={tooltipStyle} itemStyle={{ color: "var(--popover-foreground)" }} labelStyle={{ color: "var(--popover-foreground)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value: string) => (
                <span style={{ color: "var(--foreground)" }}>{value}</span>
              )} />
              <Bar dataKey="Custo total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Custo/km" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}


import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/lib/finance-store";
import { formatBRL, monthNamesPt, paymentMethods, type Transaction } from "@/lib/finance-data";

interface Props {
  month: number;
  year: number;
  monthTransactions: Transaction[];
}

export function ExpenseBreakdownChart({ monthTransactions }: { monthTransactions: Transaction[] }) {
  return (
    <BreakdownChart
      monthTransactions={monthTransactions}
      type="expense"
      title="Despesas por categoria"
      emptyLabel="Sem despesas neste período."
      drillPrefix="Despesas"
    />
  );
}

export function IncomeBreakdownChart({ monthTransactions }: { monthTransactions: Transaction[] }) {
  return (
    <BreakdownChart
      monthTransactions={monthTransactions}
      type="income"
      title="Receitas por categoria"
      emptyLabel="Sem receitas neste período."
      drillPrefix="Receitas"
    />
  );
}

function BreakdownChart({
  monthTransactions,
  type,
  title,
  emptyLabel,
  drillPrefix,
}: {
  monthTransactions: Transaction[];
  type: "income" | "expense";
  title: string;
  emptyLabel: string;
  drillPrefix: string;
}) {
  const { categories } = useFinance();
  const [drillCategoryId, setDrillCategoryId] = useState<string | null>(null);

  const expenses = monthTransactions.filter((t) => t.type === type);


  const catData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((t) => {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([id, value]) => {
        const c = categories.find((x) => x.id === id);
        return { id, name: c?.name ?? "—", value, color: c?.color ?? "#888" };
      })
      .sort((a, b) => b.value - a.value);
  }, [expenses, categories]);

  const subData = useMemo(() => {
    if (!drillCategoryId) return [];
    const cat = categories.find((c) => c.id === drillCategoryId);
    if (!cat) return [];
    const map = new Map<string, number>();
    expenses
      .filter((t) => t.categoryId === drillCategoryId)
      .forEach((t) => {
        const key = t.subcategoryId ?? "__none__";
        map.set(key, (map.get(key) ?? 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([id, value]) => {
        const sub = cat.subcategories.find((s) => s.id === id);
        return { id, name: sub?.name ?? "Sem subcategoria", value, color: cat.color };
      })
      .sort((a, b) => b.value - a.value);
  }, [drillCategoryId, categories, expenses]);

  const active = drillCategoryId ? subData : catData;
  const total = active.reduce((s, d) => s + d.value, 0);
  const drillCat = drillCategoryId ? categories.find((c) => c.id === drillCategoryId) : null;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          {drillCat ? `${drillPrefix}: ${drillCat.name}` : title}
        </CardTitle>

        {drillCategoryId && (
          <Button variant="ghost" size="sm" onClick={() => setDrillCategoryId(null)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <div className="grid h-[280px] place-items-center text-sm text-muted-foreground">
            {emptyLabel}

          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_1fr] md:items-center">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={active}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    onClick={(d: unknown) => {
                      if (!drillCategoryId) {
                        const item = d as { id?: string };
                        if (item?.id) setDrillCategoryId(item.id);
                      }
                    }}
                    cursor={drillCategoryId ? "default" : "pointer"}
                  >
                    {active.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatBRL(Number(value))}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {active.map((d) => {
                const pct = total > 0 ? (d.value / total) * 100 : 0;
                return (
                  <button
                    key={d.id}
                    onClick={() => !drillCategoryId && setDrillCategoryId(d.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent"
                    disabled={!!drillCategoryId}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="font-medium">{formatBRL(d.value)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {pct.toFixed(1)}%
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {!drillCategoryId && catData.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Clique em uma categoria para ver as subcategorias.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function MonthlyComparisonChart({ month, year }: Props) {
  const { transactions } = useFinance();

  const data = useMemo(() => {
    const arr: { name: string; Receitas: number; Despesas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(year, month - 1 - i, 1);
      const m = dt.getMonth() + 1;
      const y = dt.getFullYear();
      const monthTx = transactions.filter((t) => {
        const [ty, tm] = t.date.split("-").map(Number);
        return ty === y && tm === m;
      });
      arr.push({
        name: `${monthNamesPt[m - 1].slice(0, 3)}/${String(y).slice(2)}`,
        Receitas: monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
        Despesas: monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      });
    }
    return arr;
  }, [month, year, transactions]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Receitas vs Despesas (últimos 6 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tick={{ fill: "var(--muted-foreground)" }}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tick={{ fill: "var(--muted-foreground)" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                }
              />
              <Tooltip
                formatter={(value: number) => formatBRL(Number(value))}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--popover-foreground)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }} />
              <Bar dataKey="Receitas" fill="var(--income)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Despesas" fill="var(--expense)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function PaymentMethodChart({ monthTransactions }: { monthTransactions: Transaction[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { Receitas: number; Despesas: number }>();
    monthTransactions.forEach((t) => {
      const key = t.paymentMethod ?? "outro";
      const entry = map.get(key) ?? { Receitas: 0, Despesas: 0 };
      if (t.type === "income") entry.Receitas += t.amount;
      else entry.Despesas += t.amount;
      map.set(key, entry);
    });
    return paymentMethods
      .filter((m) => map.has(m.value))
      .map((m) => ({ name: m.label, ...map.get(m.value)! }));
  }, [monthTransactions]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Recebimentos e custos por forma de pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="grid h-[280px] place-items-center text-sm text-muted-foreground">
            Sem lançamentos neste período.
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tick={{ fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tick={{ fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                />
                <Tooltip
                  formatter={(value: number) => formatBRL(Number(value))}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--foreground)" }} />
                <Bar dataKey="Receitas" fill="var(--income)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Despesas" fill="var(--expense)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/lib/finance-store";
import { formatBRL, monthNamesPt } from "@/lib/finance-data";

const RANGES = [6, 12, 24];

/** Saldo de cada conta ao final de cada mês (saldo inicial + entradas − saídas até o mês). */
export function BalanceHistoryChart() {
  const { accounts, transactions } = useFinance();
  const [months, setMonths] = useState(12);

  const { data, hasData } = useMemo(() => {
    const now = new Date();
    const points: Record<string, number | string>[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const cutoff = `${year}-${String(month).padStart(2, "0")}-31`;

      const point: Record<string, number | string> = {
        label: `${monthNamesPt[month - 1].slice(0, 3)}/${String(year).slice(2)}`,
      };

      let total = 0;
      for (const account of accounts) {
        const delta = transactions
          .filter((t) => t.accountId === account.id && t.date <= cutoff)
          .reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
        const value = account.initialBalance + delta;
        point[account.id] = value;
        total += value;
      }
      point.__total = total;
      points.push(point);
    }

    return { data: points, hasData: accounts.length > 0 };
  }, [accounts, transactions, months]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Evolução dos saldos</CardTitle>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={months === r ? "default" : "outline"}
              onClick={() => setMonths(r)}
            >
              {r}m
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Cadastre um saldo para acompanhar a evolução.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickFormatter={(v: number) => formatBRL(v).replace("R$", "").trim()}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
                itemStyle={{ color: "var(--popover-foreground)" }}
                labelStyle={{ color: "var(--popover-foreground)" }}
                formatter={(value: number) => formatBRL(value)}
              />
              <Legend
                formatter={(value) => <span style={{ color: "var(--foreground)" }}>{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="__total"
                name="Patrimônio total"
                stroke="var(--primary)"
                strokeWidth={3}
                dot={false}
              />
              {accounts.map((a) => (
                <Line
                  key={a.id}
                  type="monotone"
                  dataKey={a.id}
                  name={a.name}
                  stroke={a.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

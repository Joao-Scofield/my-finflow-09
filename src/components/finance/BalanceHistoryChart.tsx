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
    const cutoffs: { label: string; cutoff: string }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      cutoffs.push({
        label: `${monthNamesPt[month - 1].slice(0, 3)}/${String(year).slice(2)}`,
        cutoff: `${year}-${String(month).padStart(2, "0")}-31`,
      });
    }

    // Uma passada só: acumula o delta de cada conta no primeiro mês em que se aplica.
    const deltas = new Map<string, number[]>();
    for (const account of accounts) deltas.set(account.id, new Array(cutoffs.length).fill(0));
    for (const t of transactions) {
      const bucket = deltas.get(t.accountId ?? "");
      if (!bucket) continue;
      const index = cutoffs.findIndex((c) => t.date <= c.cutoff);
      if (index === -1) continue;
      bucket[index] += t.type === "income" ? t.amount : -t.amount;
    }

    const points = cutoffs.map(({ label }, index) => {
      const point: Record<string, number | string> = { label };
      let total = 0;
      for (const account of accounts) {
        const bucket = deltas.get(account.id)!;
        let value = account.initialBalance;
        for (let i = 0; i <= index; i++) value += bucket[i];
        point[account.id] = value;
        total += value;
      }
      point.__total = total;
      return point;
    });

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

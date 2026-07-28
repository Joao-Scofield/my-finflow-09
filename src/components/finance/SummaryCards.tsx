import { ArrowDownRight, ArrowUpRight, Scale, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/finance-data";
import { cn } from "@/lib/utils";

interface Props {
  income: number;
  expense: number;
  accountsTotal: number;
}

export function SummaryCards({ income, expense, accountsTotal }: Props) {
  const balance = income - expense;
  const total = accountsTotal;

  const items = [
    {
      label: "Patrimônio (saldos)",
      value: total,
      icon: Wallet,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Receitas",
      value: income,
      icon: ArrowUpRight,
      accent: "text-income",
      bg: "bg-income/10",
    },
    {
      label: "Despesas",
      value: expense,
      icon: ArrowDownRight,
      accent: "text-expense",
      bg: "bg-expense/10",
    },
    {
      label: "Balanço do Mês",
      value: balance,
      icon: Scale,
      accent: balance >= 0 ? "text-income" : "text-expense",
      bg: balance >= 0 ? "bg-income/10" : "bg-expense/10",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon, accent, bg }) => (
        <Card key={label} className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={cn("mt-2 truncate text-2xl font-semibold tracking-tight", accent)}>
                  {formatBRL(value)}
                </p>
              </div>
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", bg)}>
                <Icon className={cn("h-5 w-5", accent)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

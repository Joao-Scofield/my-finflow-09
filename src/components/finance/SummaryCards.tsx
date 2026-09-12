import { ArrowDownRight, ArrowUpRight, History, Scale, Sigma, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/finance-data";
import { cn } from "@/lib/utils";

interface Props {
  income: number;
  expense: number;
  accountsTotal: number;
  previousBalance: number;
  hasAccounts?: boolean;
}

export function SummaryCards({
  income,
  expense,
  accountsTotal,
  previousBalance,
  hasAccounts = true,
}: Props) {
  const balance = income - expense;
  const cumulative = previousBalance + balance;

  const items = [
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
      label: "Balanço do mês",
      value: balance,
      icon: Scale,
      accent: balance >= 0 ? "text-income" : "text-expense",
      bg: balance >= 0 ? "bg-income/10" : "bg-expense/10",
    },
    {
      label: "Saldo anterior",
      value: previousBalance,
      icon: History,
      accent: previousBalance >= 0 ? "text-income" : "text-expense",
      bg: "bg-muted",
    },
    {
      label: "Saldo acumulado",
      value: cumulative,
      icon: Sigma,
      accent: cumulative >= 0 ? "text-income" : "text-expense",
      bg: cumulative >= 0 ? "bg-income/10" : "bg-expense/10",
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-6">
      <Card className="bento-card surface-emerald overflow-hidden lg:col-span-2">
        <CardContent className="flex h-full flex-col justify-between gap-6 p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm/6 opacity-80">Patrimônio (saldos)</p>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="num truncate text-3xl font-semibold tracking-tight sm:text-4xl">
              {formatBRL(accountsTotal)}
            </p>
            <div className="mt-3 h-px w-16 bg-gold/70" />
            {!hasAccounts && (
              <p className="mt-3 text-xs opacity-80">
                Cadastre seus saldos no menu “Gerenciar saldos” para acompanhar o patrimônio.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-4 xl:grid-cols-3">
        {items.map(({ label, value, icon: Icon, accent, bg }) => (
          <Card key={label} className="bento-card overflow-hidden">
            <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", bg)}>
                  <Icon className={cn("h-4 w-4", accent)} />
                </div>
              </div>
              <p className={cn("num truncate text-xl font-semibold tracking-tight", accent)}>
                {formatBRL(value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

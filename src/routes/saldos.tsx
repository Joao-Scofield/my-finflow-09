import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Landmark, Loader2, Settings2, TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { Login } from "@/components/finance/Login";
import { AccountsManager } from "@/components/finance/AccountsManager";
import { LazyBalanceHistoryChart } from "@/components/finance/LazyCharts";
import { BalancesSkeleton } from "@/components/finance/Skeletons";
import { FinanceProvider, useFinance } from "@/lib/finance-store";
import { ThemeProvider } from "@/lib/theme";
import { accountKindLabel, formatBRL } from "@/lib/finance-data";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/saldos")({
  head: () => ({
    meta: [
      { title: "Saldos — Histórico e evolução do patrimônio" },
      {
        name: "description",
        content:
          "Acompanhe o saldo de cada conta mês a mês, com evolução histórica do patrimônio e variação por período.",
      },
      { property: "og:title", content: "Saldos — Histórico e evolução do patrimônio" },
      {
        property: "og:description",
        content: "Gestão de saldos com gráfico histórico por conta e patrimônio consolidado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BalancesRoute,
});

function BalancesRoute() {
  return (
    <ThemeProvider>
      <AuthShell />
    </ThemeProvider>
  );
}

function AuthShell() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setAuthenticated(Boolean(data.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session?.user));
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (authenticated === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) return <Login onLoggedIn={() => setAuthenticated(true)} />;

  return (
    <FinanceProvider>
      <BalancesPage />
    </FinanceProvider>
  );
}

function monthCutoff(offset: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-31`;
}

function BalancesPage() {
  const { accounts, transactions, loading } = useFinance();
  const [managerOpen, setManagerOpen] = useState(false);

  const rows = useMemo(() => {
    const prevCutoff = monthCutoff(1);
    return accounts.map((a) => {
      const mine = transactions.filter(
        (t) => t.accountId === a.id || t.transferAccountId === a.id,
      );
      const prev =
        a.initialBalance +
        mine.filter((t) => t.date <= prevCutoff).reduce((s, t) => {
          if (t.type === "transfer") return s + (t.transferAccountId === a.id ? t.amount : -t.amount);
          return s + (t.type === "income" ? t.amount : -t.amount);
        }, 0);
      const income = mine
        .filter((t) => t.type === "income" && t.date > prevCutoff)
        .reduce((s, t) => s + t.amount, 0);
      const expense = mine
        .filter((t) => t.type === "expense" && t.date > prevCutoff)
        .reduce((s, t) => s + t.amount, 0);
      const change = a.balance - prev;
      const pct = prev !== 0 ? (change / Math.abs(prev)) * 100 : null;
      return { account: a, prev, income, expense, change, pct };
    });
  }, [accounts, transactions]);

  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const totalPrev = rows.reduce((s, r) => s + r.prev, 0);
  const totalChange = total - totalPrev;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        icon={Landmark}
        active="/saldos"
        actions={
          <Button variant="outline" size="sm" onClick={() => setManagerOpen(true)}>
            <Settings2 className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Gerenciar</span>
          </Button>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {loading ? (
          <BalancesSkeleton />
        ) : (
          <>
            <section>
              <p className="text-sm text-muted-foreground">Gestão de saldos</p>
              <h1 className="text-xl font-semibold tracking-tight">Patrimônio e histórico</h1>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bento-card">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Patrimônio total</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{formatBRL(total)}</p>
                </CardContent>
              </Card>
              <Card className="bento-card">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Variação no mês</p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-semibold tabular-nums",
                      totalChange >= 0 ? "text-income" : "text-expense",
                    )}
                  >
                    {totalChange >= 0 ? "+" : "−"}
                    {formatBRL(Math.abs(totalChange))}
                  </p>
                </CardContent>
              </Card>
              <Card className="bento-card">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Contas cadastradas</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{accounts.length}</p>
                </CardContent>
              </Card>
              <Card className="bento-card">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Mês anterior</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{formatBRL(totalPrev)}</p>
                </CardContent>
              </Card>
            </div>

            <LazyBalanceHistoryChart />

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {rows.map(({ account, change, pct }) => (
                <Card key={account.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                      <p className="truncate text-sm font-medium">{account.name}</p>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {accountKindLabel(account.kind)}
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold tabular-nums">
                      {formatBRL(account.balance)}
                    </p>
                    <p
                      className={cn(
                        "mt-1 flex items-center gap-1 text-xs",
                        change >= 0 ? "text-income" : "text-expense",
                      )}
                    >
                      {change >= 0 ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {change >= 0 ? "+" : "−"}
                      {formatBRL(Math.abs(change))}
                      {pct !== null && ` (${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%)`} no
                      mês
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bento-card">
              <CardHeader>
                <CardTitle className="text-base">Detalhamento por saldo</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {rows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum saldo cadastrado ainda.
                  </p>
                ) : (
                  <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
                    <Table className="min-w-[720px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Saldo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Inicial</TableHead>
                          <TableHead className="text-right">Mês anterior</TableHead>
                          <TableHead className="text-right">Entradas</TableHead>
                          <TableHead className="text-right">Saídas</TableHead>
                          <TableHead className="text-right">Atual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map(({ account, prev, income, expense }) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {accountKindLabel(account.kind)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatBRL(account.initialBalance)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatBRL(prev)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-income">
                              {formatBRL(income)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-expense">
                              {formatBRL(expense)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {formatBRL(account.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <AccountsManager open={managerOpen} onOpenChange={setManagerOpen} />
      <Toaster richColors position="top-right" />
    </div>
  );
}

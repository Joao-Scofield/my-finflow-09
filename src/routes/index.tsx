import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, ChevronDown, KeyRound, Landmark, Loader2, LogOut, Menu, Plus, Settings2, Sparkles, Upload, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { PeriodSelector } from "@/components/finance/PeriodSelector";
import { ApiTokensManager } from "@/components/finance/ApiTokensManager";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { TransactionModal } from "@/components/finance/TransactionModal";
import { TransactionsTable } from "@/components/finance/TransactionsTable";
import { CategoriesManager } from "@/components/finance/CategoriesManager";
import { ImportModal } from "@/components/finance/ImportModal";
import { RulesManager } from "@/components/finance/RulesManager";
import { AccountsManager } from "@/components/finance/AccountsManager";
import { Login } from "@/components/finance/Login";
import {
  ExpenseBreakdownChart,
  IncomeBreakdownChart,
  MonthlyComparisonChart,
  PaymentMethodChart,
} from "@/components/finance/Charts";

import { ThemeToggle } from "@/components/finance/ThemeToggle";
import { FinanceProvider, useFinance } from "@/lib/finance-store";
import { ThemeProvider } from "@/lib/theme";
import { monthNamesPt, type Transaction } from "@/lib/finance-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Finlyn — Gestão Financeira Pessoal" },
      {
        name: "description",
        content:
          "Controle receitas, despesas, categorias e visualize relatórios do seu dinheiro em um painel moderno.",
      },
      { property: "og:title", content: "Finlyn — Gestão Financeira Pessoal" },
      {
        property: "og:description",
        content:
          "Painel completo com filtros por período, categorias personalizáveis e gráficos interativos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
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

  if (!authenticated) {
    return <Login onLoggedIn={() => setAuthenticated(true)} />;
  }

  return (
    <FinanceProvider>
      <Dashboard />
    </FinanceProvider>
  );
}

function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);

  const { transactions, accounts, profile, loading } = useFinance();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const monthTx = useMemo(
    () =>
      transactions.filter((t) => {
        const [ty, tm] = t.date.split("-").map(Number);
        return ty === year && tm === month;
      }),
    [transactions, month, year],
  );

  const income = monthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = monthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const accountsTotal = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold sm:text-lg">Finlyn</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Sua gestão financeira pessoal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-32 truncate text-sm text-muted-foreground md:inline">
              {profile?.displayName}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Menu className="h-4 w-4" />
                  Menu
                  <ChevronDown className="h-4 w-4 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ferramentas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Excel
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAccountsOpen(true)}>
                  <Landmark className="mr-2 h-4 w-4" />
                  Gerenciar saldos
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRulesOpen(true)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Regras
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setApiOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  API
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCatOpen(true)}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Categorias
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Módulos</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/frota">
                    <Car className="mr-2 h-4 w-4" />
                    Frota
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => handleSignOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {loading ? (
          <div className="grid min-h-96 place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Período</p>
            <h2 className="text-xl font-semibold tracking-tight">
              {monthNamesPt[month - 1]} / {year}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelector
              month={month}
              year={year}
              onChange={(m, y) => {
                setMonth(m);
                setYear(y);
              }}
            />
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Nova transação
            </Button>
          </div>
        </section>

        <SummaryCards income={income} expense={expense} accountsTotal={accountsTotal} />

        <div className="grid gap-4 lg:grid-cols-2">
          <ExpenseBreakdownChart monthTransactions={monthTx} />
          <IncomeBreakdownChart monthTransactions={monthTx} />
        </div>

        <PaymentMethodChart monthTransactions={monthTx} />

        <MonthlyComparisonChart month={month} year={year} monthTransactions={monthTx} />


        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transações do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsTable
              transactions={monthTx}
              onEdit={(t) => {
                setEditing(t);
                setModalOpen(true);
              }}
            />
          </CardContent>
        </Card>
          </>
        )}
      </main>

      <TransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        editing={editing}
        defaultDate={`${year}-${String(month).padStart(2, "0")}-${String(
          Math.min(new Date().getDate(), 28),
        ).padStart(2, "0")}`}
      />
      <CategoriesManager open={catOpen} onOpenChange={setCatOpen} />
      <ImportModal open={importOpen} onOpenChange={setImportOpen} />
      <RulesManager open={rulesOpen} onOpenChange={setRulesOpen} />
      <AccountsManager open={accountsOpen} onOpenChange={setAccountsOpen} />
      <ApiTokensManager open={apiOpen} onOpenChange={setApiOpen} />
      <Toaster richColors position="top-right" />
    </div>
  );
}

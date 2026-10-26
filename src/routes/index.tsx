import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarClock,
  Car,
  ChevronDown,
  KeyRound,
  Landmark,
  ListChecks,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Settings2,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Upload,
  UserRound,
  Wallet,
} from "lucide-react";
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
const ImportModal = lazy(() =>
  import("@/components/finance/ImportModal").then((m) => ({ default: m.ImportModal })),
);
import { RecurringsManager } from "@/components/finance/RecurringsManager";
import { RulesManager } from "@/components/finance/RulesManager";
import { AccountsManager } from "@/components/finance/AccountsManager";
import { ProfileModal } from "@/components/finance/ProfileModal";
import { Login } from "@/components/finance/Login";
import { PrivacyToggle } from "@/components/finance/PrivacyToggle";
import { DashboardSkeleton } from "@/components/finance/Skeletons";
import {
  LazyExpenseBreakdownChart,
  LazyIncomeBreakdownChart,
  LazyMonthlyComparisonChart,
  LazyPaymentMethodChart,
} from "@/components/finance/LazyCharts";

import { ThemeToggle } from "@/components/finance/ThemeToggle";
import { FinanceProvider, useFinance } from "@/lib/finance-store";
import { ThemeProvider } from "@/lib/theme";
import { usePrivacy } from "@/lib/privacy";
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
  usePrivacy();
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
  const [period, setPeriod] = useState({
    startMonth: now.getMonth() + 1,
    startYear: now.getFullYear(),
    endMonth: now.getMonth() + 1,
    endYear: now.getFullYear(),
  });
  const month = period.endMonth;
  const year = period.endYear;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [apiOpen, setApiOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { transactions, accounts, profile, loading } = useFinance();

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  // Índice mês -> transações calculado uma vez; trocar de mês vira lookup O(1).
  const txByMonth = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const key = t.date.slice(0, 7);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [transactions]);

  const monthTx = useMemo(() => {
    const start = period.startYear * 12 + (period.startMonth - 1);
    const end = period.endYear * 12 + (period.endMonth - 1);
    const out: Transaction[] = [];
    for (let i = start; i <= end; i++) {
      const y = Math.floor(i / 12);
      const m = (i % 12) + 1;
      const list = txByMonth.get(`${y}-${String(m).padStart(2, "0")}`);
      if (list) out.push(...list);
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [txByMonth, period]);

  const isRange =
    period.startMonth !== period.endMonth || period.startYear !== period.endYear;

  const income = monthTx
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = monthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const accountsTotal = accounts.reduce((s, a) => s + a.balance, 0);

  // Resultado acumulado de tudo que veio antes do período selecionado.
  const previousBalance = useMemo(() => {
    const firstDay = `${period.startYear}-${String(period.startMonth).padStart(2, "0")}-01`;
    let total = 0;
    for (const t of transactions) {
      if (t.date >= firstDay) continue;
      if (t.type === "income") total += t.amount;
      else if (t.type === "expense") total -= t.amount;
    }
    return total;
  }, [transactions, period.startMonth, period.startYear]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="surface-emerald grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-sm">
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
            <PrivacyToggle />
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
                <DropdownMenuItem onSelect={() => setRecurringOpen(true)}>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Recorrentes
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
                  <Link to="/lancamentos" preload="intent">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Lançamentos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/saldos" preload="intent">
                    <Landmark className="mr-2 h-4 w-4" />
                    Saldos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/projecao" preload="intent">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Projeção
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contas" preload="intent">
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Contas a pagar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/frota" preload="intent">
                    <Car className="mr-2 h-4 w-4" />
                    Frota
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/lista" preload="intent">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Lista de compras
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/comprovante" preload="intent">
                    <Receipt className="mr-2 h-4 w-4" />
                    Importar comprovante
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                  <UserRound className="mr-2 h-4 w-4" />
                  Editar perfil
                </DropdownMenuItem>
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

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Período</p>
                <h2 className="gold-rule truncate text-lg font-semibold tracking-tight sm:text-xl">
                  {isRange
                    ? `${monthNamesPt[period.startMonth - 1]}/${period.startYear} — ${monthNamesPt[period.endMonth - 1]}/${period.endYear}`
                    : `${monthNamesPt[month - 1]} / ${year}`}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PeriodSelector value={period} onChange={setPeriod} />
                <Button
                  className="w-full sm:w-auto"
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

            <SummaryCards
              income={income}
              expense={expense}
              accountsTotal={accountsTotal}
              previousBalance={previousBalance}
              hasAccounts={accounts.length > 0}
            />

            <div className="grid gap-4 lg:grid-cols-6">
              <div className="min-w-0 lg:col-span-4">
                <LazyExpenseBreakdownChart monthTransactions={monthTx} />
              </div>
              <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
                <LazyIncomeBreakdownChart monthTransactions={monthTx} />
                <LazyPaymentMethodChart monthTransactions={monthTx} />
              </div>
              <div className="min-w-0 lg:col-span-6">
                <LazyMonthlyComparisonChart month={month} year={year} monthTransactions={monthTx} />
              </div>
            </div>

            <Card className="bento-card">
              <CardHeader>
                <CardTitle className="gold-rule text-base">
                  {isRange ? "Transações do período" : "Transações do mês"}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
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
      {importOpen && (
        <Suspense fallback={null}>
          <ImportModal open={importOpen} onOpenChange={setImportOpen} />
        </Suspense>
      )}
      <RecurringsManager open={recurringOpen} onOpenChange={setRecurringOpen} />
      <RulesManager open={rulesOpen} onOpenChange={setRulesOpen} />
      <AccountsManager open={accountsOpen} onOpenChange={setAccountsOpen} />
      <ApiTokensManager open={apiOpen} onOpenChange={setApiOpen} />
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <Toaster richColors position="top-right" />
    </div>
  );
}

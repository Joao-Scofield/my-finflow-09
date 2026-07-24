import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Settings2, Upload, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { PeriodSelector } from "@/components/finance/PeriodSelector";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { TransactionModal } from "@/components/finance/TransactionModal";
import { TransactionsTable } from "@/components/finance/TransactionsTable";
import { CategoriesManager } from "@/components/finance/CategoriesManager";
import { ImportModal } from "@/components/finance/ImportModal";
import { ExpenseBreakdownChart, MonthlyComparisonChart } from "@/components/finance/Charts";
import { ThemeToggle } from "@/components/finance/ThemeToggle";
import { FinanceProvider, useFinance } from "@/lib/finance-store";
import { ThemeProvider } from "@/lib/theme";
import { monthNamesPt, type Transaction } from "@/lib/finance-data";

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
      <FinanceProvider>
        <Dashboard />
      </FinanceProvider>
    </ThemeProvider>
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

  const { transactions } = useFinance();

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
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Importar Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCatOpen(true)}>
              <Settings2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Categorias</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
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

        <SummaryCards income={income} expense={expense} />

        <div className="grid gap-4 lg:grid-cols-2">
          <ExpenseBreakdownChart monthTransactions={monthTx} />
          <MonthlyComparisonChart month={month} year={year} monthTransactions={monthTx} />
        </div>

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
      <Toaster richColors position="top-right" />
    </div>
  );
}

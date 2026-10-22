import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { Login } from "@/components/finance/Login";
import { CardsSection, DebtsSection } from "@/components/finance/CardsAndDebts";
import { BalancesSkeleton } from "@/components/finance/Skeletons";
import { FinanceProvider, useFinance } from "@/lib/finance-store";
import { ThemeProvider } from "@/lib/theme";
import { usePrivacy } from "@/lib/privacy";
import { formatBRL, monthForecast, monthNamesPt, shiftMonth } from "@/lib/finance-data";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dividas")({
  head: () => ({
    meta: [
      { title: "Dívidas e cartões — Faturas e parcelas do mês" },
      {
        name: "description",
        content:
          "Cadastre cartões com fechamento e vencimento, acompanhe faturas e parcelas de dívidas e veja a sobra prevista do mês.",
      },
      { property: "og:title", content: "Dívidas e cartões — Faturas e parcelas do mês" },
      {
        property: "og:description",
        content: "Faturas por cartão, parcelas de dívidas e sobra prevista do mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DividasRoute,
});

function DividasRoute() {
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

  if (!authenticated) return <Login onLoggedIn={() => setAuthenticated(true)} />;

  return (
    <FinanceProvider>
      <DividasPage />
    </FinanceProvider>
  );
}

function currentYM() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function DividasPage() {
  const { cards, debts, transactions, cardInvoicePayments, loading } = useFinance();
  const [ym, setYm] = useState(currentYM);

  const forecast = useMemo(
    () => monthForecast(ym, transactions, cards, debts, cardInvoicePayments),
    [ym, transactions, cards, debts, cardInvoicePayments],
  );

  const [year, month] = ym.split("-").map(Number);
  const label = `${monthNamesPt[month - 1]} de ${year}`;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader icon={CreditCard} active="/dividas" />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Mês anterior"
              onClick={() => setYm(shiftMonth(ym, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[10rem] text-center text-lg font-semibold capitalize">
              {label}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Próximo mês"
              onClick={() => setYm(shiftMonth(ym, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {ym !== currentYM() && (
            <Button variant="ghost" size="sm" onClick={() => setYm(currentYM())}>
              Ir para este mês
            </Button>
          )}
        </div>

        {loading ? (
          <BalancesSkeleton />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sobra prevista do mês</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    forecast.left < 0 ? "text-destructive" : "text-emerald-600",
                  )}
                >
                  {formatBRL(forecast.left)}
                </p>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Item label="Entradas" value={forecast.income} />
                  <Item label="Gastos sem cartão" value={-forecast.expenses} />
                  <Item label="Parcelas de dívidas" value={-forecast.debtsDue} />
                  <Item label="Faturas em aberto" value={-forecast.invoicesDue} />
                </dl>
                <p className="text-xs text-muted-foreground">
                  Compras no cartão entram na sobra pelo valor da fatura que vence no mês, não na
                  data da compra.
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <CardsSection ym={ym} />
              <DebtsSection />
            </div>
          </>
        )}
      </main>
      <Toaster />
    </div>
  );
}

function Item({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{formatBRL(value)}</dd>
    </div>
  );
}

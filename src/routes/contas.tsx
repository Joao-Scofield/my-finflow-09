import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Check, Loader2, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { Login } from "@/components/finance/Login";
import { BalancesSkeleton } from "@/components/finance/Skeletons";
import { BillDialog, PayBillDialog } from "@/components/bills/BillForms";
import { FinanceProvider } from "@/lib/finance-store";
import { BillsProvider, useBills } from "@/lib/bills-store";
import { ThemeProvider } from "@/lib/theme";
import { usePrivacy } from "@/lib/privacy";
import { formatBRL } from "@/lib/finance-data";
import { dueLabel, dueTone, formatDateBR, type Bill } from "@/lib/bills-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contas")({
  head: () => ({
    meta: [
      { title: "Contas a pagar — Vencimentos e avisos por e-mail" },
      {
        name: "description",
        content:
          "Cadastre contas com data de vencimento, receba aviso por e-mail antes de vencer e lance a despesa ao pagar.",
      },
      { property: "og:title", content: "Contas a pagar — Vencimentos e avisos por e-mail" },
      {
        property: "og:description",
        content: "Controle de vencimentos, lembretes por e-mail e baixa automática no fluxo de caixa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillsRoute,
});

function BillsRoute() {
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
      <BillsProvider>
        <BillsPage />
      </BillsProvider>
    </FinanceProvider>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="bento-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const toneStyle = {
  overdue: { borderColor: "#ef4444", color: "#ef4444" },
  soon: { borderColor: "#f59e0b", color: "#f59e0b" },
  future: { borderColor: "#64748b", color: "#64748b" },
  paid: { borderColor: "#10b981", color: "#10b981" },
} as const;

function BillsPage() {
  const { bills, loading, deleteBill, unmarkPaid } = useBills();
  const [filter, setFilter] = useState<"pending" | "paid" | "todas">("pending");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [paying, setPaying] = useState<Bill | null>(null);

  const stats = useMemo(() => {
    const pending = bills.filter((b) => b.status === "pending");
    const overdue = pending.filter((b) => dueTone(b.dueDate, b.status) === "overdue");
    const paid = bills.filter((b) => b.status === "paid");
    return {
      pendingTotal: pending.reduce((s, b) => s + b.amount, 0),
      pendingCount: pending.length,
      overdueTotal: overdue.reduce((s, b) => s + b.amount, 0),
      overdueCount: overdue.length,
      paidTotal: paid.reduce((s, b) => s + b.amount, 0),
      paidCount: paid.length,
    };
  }, [bills]);

  const visible = useMemo(
    () =>
      bills
        .filter((b) => filter === "todas" || b.status === filter)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [bills, filter],
  );

  async function remove(id: string) {
    try {
      await deleteBill(id);
      toast.success("Conta removida.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível remover a conta.");
    }
  }

  async function undo(id: string) {
    try {
      await unmarkPaid(id);
      toast.success("Pagamento desfeito.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível desfazer o pagamento.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader icon={CalendarClock} active="/contas" />

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        {loading ? (
          <BalancesSkeleton />
        ) : (
          <>
            <section className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Contas a pagar</h1>
                <p className="text-sm text-muted-foreground">
                  Configure vencimentos e receba um aviso por e-mail antes de vencer.
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Nova conta
              </Button>
            </section>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="A pagar"
                value={formatBRL(stats.pendingTotal)}
                hint={`${stats.pendingCount} conta(s) em aberto`}
              />
              <StatCard
                label="Vencidas"
                value={formatBRL(stats.overdueTotal)}
                hint={`${stats.overdueCount} conta(s) atrasada(s)`}
              />
              <StatCard
                label="Já pagas"
                value={formatBRL(stats.paidTotal)}
                hint={`${stats.paidCount} conta(s) quitada(s)`}
              />
            </div>

            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Em aberto</SelectItem>
                <SelectItem value="paid">Pagas</SelectItem>
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>

            {visible.length === 0 ? (
              <Card className="bento-card">
                <CardContent className="grid place-items-center gap-3 p-10 text-center">
                  <CalendarClock className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Nenhuma conta por aqui</p>
                    <p className="text-sm text-muted-foreground">
                      Cadastre suas contas fixas para não perder nenhum vencimento.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar conta
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {visible.map((b) => {
                  const tone = dueTone(b.dueDate, b.status);
                  return (
                    <div key={b.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{b.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            Vence em {formatDateBR(b.dueDate)}
                            {b.recurring ? " · mensal" : ""}
                          </p>
                        </div>
                        <Badge variant="outline" style={toneStyle[tone]}>
                          {b.status === "paid" ? "Paga" : dueLabel(b.dueDate)}
                        </Badge>
                      </div>

                      <p className="mt-3 text-xl font-semibold tabular-nums">
                        {formatBRL(b.amount)}
                      </p>
                      {b.status === "paid" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {`Paga em ${b.paidAt ? formatDateBR(b.paidAt) : "—"}`}
                        </p>
                      )}
                      {b.notes && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{b.notes}</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-1">
                        {b.status === "pending" ? (
                          <Button size="sm" onClick={() => setPaying(b)}>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Marcar como paga
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => void undo(b.id)}>
                            <Undo2 className="mr-1 h-3.5 w-3.5" />
                            Desfazer
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(b);
                            setFormOpen(true);
                          }}
                          aria-label="Editar conta"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void remove(b.id)}
                          aria-label="Excluir conta"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <BillDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <PayBillDialog bill={paying} onOpenChange={(v) => !v && setPaying(null)} />
      <Toaster />
    </div>
  );
}

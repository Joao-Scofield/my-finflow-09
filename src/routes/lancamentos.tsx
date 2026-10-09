import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCheck,
  CircleCheck,
  CircleDashed,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Repeat,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { TransactionModal } from "@/components/finance/TransactionModal";
import { FinanceProvider, useFinance } from "@/lib/finance-store";
import {
  formatBRL,
  monthNamesPt,
  paymentMethodLabel,
  type Transaction,
} from "@/lib/finance-data";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lancamentos")({
  head: () => ({
    meta: [
      { title: "Lançamentos — Controle do que foi pago e conferido" },
      {
        name: "description",
        content:
          "Acompanhe lançamentos pagos e pendentes, veja quais contas fixas já entraram no mês e confira cada um com o extrato do banco.",
      },
      { property: "og:title", content: "Lançamentos — Controle do que foi pago e conferido" },
      {
        property: "og:description",
        content: "Pagos x pendentes, lançamentos fixos do mês e conferência com o banco.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthShell,
});

function AuthShell() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setAuthenticated(Boolean(data.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthenticated(Boolean(session?.user));
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  if (authenticated === null)
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!authenticated) return <Login onLoggedIn={() => setAuthenticated(true)} />;
  return (
    <FinanceProvider>
      <LancamentosPage />
    </FinanceProvider>
  );
}

type StatusTab = "todos" | "pendentes" | "pagos" | "nao_conferidos";

function StatCard({
  label,
  value,
  hint,
  active,
  onClick,
}: {
  label: string;
  value: string;
  hint: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className={cn("bento-card h-full transition", active && "ring-2 ring-primary")}>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </button>
  );
}

function LancamentosPage() {
  const { transactions, recurrings, categories, accounts, loading, setTransactionFlags } =
    useFinance();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<StatusTab>("todos");
  const [q, setQ] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);

  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const monthTx = useMemo(
    () => transactions.filter((t) => t.date.startsWith(prefix)),
    [transactions, prefix],
  );

  const stats = useMemo(() => {
    const cash = monthTx.filter((t) => t.type !== "transfer");
    const pend = cash.filter((t) => t.status === "pending");
    const paid = cash.filter((t) => t.status === "paid");
    const notRec = monthTx.filter((t) => !t.reconciled);
    return {
      total: monthTx.length,
      pend: pend.length,
      pendSum: pend.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0),
      paid: paid.length,
      notRec: notRec.length,
      recPct: monthTx.length ? Math.round(((monthTx.length - notRec.length) / monthTx.length) * 100) : 0,
    };
  }, [monthTx]);

  const fixed = useMemo(() => {
    const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
    return recurrings
      .filter((r) => {
        if (!r.active) return false;
        const start = r.startDate.slice(0, 7);
        if (start > prefix) return false;
        if (r.endDate && r.endDate.slice(0, 7) < prefix) return false;
        return true;
      })
      .map((r) => {
        const tx = monthTx.find((t) => t.recurringId === r.id);
        let state: "lancado" | "aguardando" | "faltando" = "faltando";
        if (tx) state = "lancado";
        else if (prefix > `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
          state = "aguardando";
        else if (isCurrent && r.dayOfMonth > now.getDate()) state = "aguardando";
        return { r, tx, state };
      })
      .sort((a, b) => a.r.dayOfMonth - b.r.dayOfMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurrings, monthTx, prefix, month, year]);

  const visible = useMemo(() => {
    return monthTx
      .filter((t) => {
        if (tab === "pendentes" && !(t.status === "pending" && t.type !== "transfer")) return false;
        if (tab === "pagos" && !(t.status === "paid" && t.type !== "transfer")) return false;
        if (tab === "nao_conferidos" && t.reconciled) return false;
        if (accountFilter !== "all" && t.accountId !== accountFilter && t.transferAccountId !== accountFilter)
          return false;
        if (q) {
          const s = q.toLowerCase();
          const cat = catMap.get(t.categoryId)?.name ?? "";
          if (
            !t.description.toLowerCase().includes(s) &&
            !cat.toLowerCase().includes(s) &&
            !String(t.amount).includes(s.replace(",", "."))
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [monthTx, tab, accountFilter, q, catMap]);

  useEffect(() => setSelected(new Set()), [prefix, tab]);

  async function apply(ids: string[], patch: { status?: "paid" | "pending"; reconciled?: boolean }) {
    setBusy(true);
    try {
      await setTransactionFlags(ids, patch);
      setSelected(new Set());
    } catch {
      toast.error("Não foi possível atualizar os lançamentos");
    } finally {
      setBusy(false);
    }
  }

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 4 + i);
  const selIds = [...selected];
  const allSelected = visible.length > 0 && visible.every((t) => selected.has(t.id));

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <AppHeader
        icon={ListChecks}
        active="/lancamentos"
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Novo</span>
          </Button>
        }
      />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">Lançamentos</h1>
            <p className="text-sm text-muted-foreground">
              Veja o que já foi pago, o que falta e o que já foi conferido com o banco.
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNamesPt.map((n, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <BalancesSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Todos no mês"
                value={String(stats.total)}
                hint="lançamentos"
                active={tab === "todos"}
                onClick={() => setTab("todos")}
              />
              <StatCard
                label="Pendentes"
                value={String(stats.pend)}
                hint={`impacto ${formatBRL(stats.pendSum)}`}
                active={tab === "pendentes"}
                onClick={() => setTab("pendentes")}
              />
              <StatCard
                label="Pagos / recebidos"
                value={String(stats.paid)}
                hint="já realizados"
                active={tab === "pagos"}
                onClick={() => setTab("pagos")}
              />
              <StatCard
                label="Não conferidos"
                value={String(stats.notRec)}
                hint={`${stats.recPct}% conferido com o banco`}
                active={tab === "nao_conferidos"}
                onClick={() => setTab("nao_conferidos")}
              />
            </div>

            <Card className="bento-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Repeat className="h-4 w-4" /> Lançamentos fixos de {monthNamesPt[month - 1]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fixed.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum lançamento fixo para este mês.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {fixed.map(({ r, tx, state }) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Todo dia {r.dayOfMonth} · {formatBRL(r.amount)}
                          </p>
                        </div>
                        {state === "lancado" ? (
                          <Badge
                            variant="outline"
                            className="border-income/40 bg-income/10 text-income"
                          >
                            <CircleCheck className="mr-1 h-3 w-3" />
                            Lançado{tx?.status === "pending" ? " · pendente" : ""}
                          </Badge>
                        ) : state === "aguardando" ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            <CircleDashed className="mr-1 h-3 w-3" />
                            Entra no dia {r.dayOfMonth}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-expense/40 bg-expense/10 text-expense"
                          >
                            Não lançado
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por descrição, categoria ou valor..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os saldos</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-2 text-sm">
                <span className="px-2">{selIds.length} selecionado(s)</span>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => apply(selIds, { status: "paid" })}>
                  <CheckCheck className="mr-1 h-4 w-4" /> Marcar pago
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => apply(selIds, { status: "pending" })}>
                  Marcar pendente
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => apply(selIds, { reconciled: true })}>
                  <ShieldCheck className="mr-1 h-4 w-4" /> Conferido
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => apply(selIds, { reconciled: false })}>
                  Desfazer conferência
                </Button>
              </div>
            )}

            <div className="rounded-lg border">
              <div className="flex items-center gap-3 border-b px-3 py-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) =>
                    setSelected(v ? new Set(visible.map((t) => t.id)) : new Set())
                  }
                  aria-label="Selecionar todos"
                />
                <span>{visible.length} lançamento(s)</span>
              </div>
              {visible.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum lançamento encontrado.
                </p>
              )}
              <ul className="divide-y">
                {visible.map((t) => {
                  const isTransfer = t.type === "transfer";
                  const cat = catMap.get(t.categoryId);
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) next.add(t.id);
                          else next.delete(t.id);
                          setSelected(next);
                        }}
                        aria-label="Selecionar"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {t.recurringId && <Repeat className="h-3 w-3 shrink-0 text-muted-foreground" />}
                          {t.description || "—"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")} ·{" "}
                          {isTransfer
                            ? `${accMap.get(t.accountId ?? "")?.name ?? "—"} → ${accMap.get(t.transferAccountId ?? "")?.name ?? "—"}`
                            : `${cat?.name ?? "—"} · ${paymentMethodLabel(t.paymentMethod)} · ${accMap.get(t.accountId ?? "")?.name ?? "sem saldo"}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            isTransfer
                              ? "text-muted-foreground"
                              : t.type === "income"
                                ? "text-income"
                                : "text-expense",
                          )}
                        >
                          {isTransfer ? "↔" : t.type === "income" ? "+" : "-"} {formatBRL(t.amount)}
                        </span>
                        <div className="flex gap-1">
                          {!isTransfer && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                apply([t.id], { status: t.status === "paid" ? "pending" : "paid" })
                              }
                            >
                              <Badge
                                variant="outline"
                                className={
                                  t.status === "paid"
                                    ? "border-income/40 bg-income/10 text-income"
                                    : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                }
                              >
                                {t.status === "paid" ? "Pago" : "Pendente"}
                              </Badge>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => apply([t.id], { reconciled: !t.reconciled })}
                            title="Conferido com o extrato do banco"
                          >
                            <Badge
                              variant="outline"
                              className={t.reconciled ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground"}
                            >
                              <ShieldCheck className="mr-1 h-3 w-3" />
                              {t.reconciled ? "Conferido" : "Conferir"}
                            </Badge>
                          </button>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Editar"
                        onClick={() => {
                          setEditing(t);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </main>
      <TransactionModal open={modalOpen} onOpenChange={setModalOpen} editing={editing} />
    </div>
  );
}

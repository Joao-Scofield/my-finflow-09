import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ExternalLink,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Undo2,
} from "lucide-react";
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
import { PurchaseDialog, ShoppingItemDialog } from "@/components/shopping/ShoppingForms";
import { FinanceProvider } from "@/lib/finance-store";
import { ShoppingProvider, useShopping } from "@/lib/shopping-store";
import { ThemeProvider } from "@/lib/theme";
import { formatBRL } from "@/lib/finance-data";
import {
  itemTotal,
  priorityColor,
  priorityLabel,
  priorityRank,
  type ShoppingItem,
} from "@/lib/shopping-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/lista")({
  head: () => ({
    meta: [
      { title: "Lista de compras — Desejos e planejamento de gastos" },
      {
        name: "description",
        content:
          "Monte sua lista de desejos com valor estimado, link de compra e prioridade, e lance a despesa no financeiro ao comprar.",
      },
      { property: "og:title", content: "Lista de compras — Desejos e planejamento de gastos" },
      {
        property: "og:description",
        content: "Itens desejados, prioridade, valor estimado e integração com o seu financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShoppingRoute,
});

function ShoppingRoute() {
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
      <ShoppingProvider>
        <ShoppingPage />
      </ShoppingProvider>
    </FinanceProvider>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ShoppingPage() {
  const { items, loading, deleteItem, unmarkPurchased } = useShopping();
  const [status, setStatus] = useState<"todos" | "desejado" | "comprado">("desejado");
  const [priority, setPriority] = useState<"todas" | "alta" | "media" | "baixa">("todas");
  const [sort, setSort] = useState<"prioridade" | "valor">("prioridade");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [purchasing, setPurchasing] = useState<ShoppingItem | null>(null);

  const stats = useMemo(() => {
    const pending = items.filter((i) => i.status === "desejado");
    const bought = items.filter((i) => i.status === "comprado");
    return {
      pendingTotal: pending.reduce((s, i) => s + itemTotal(i), 0),
      boughtTotal: bought.reduce((s, i) => s + itemTotal(i), 0),
      pendingCount: pending.length,
      boughtCount: bought.length,
    };
  }, [items]);

  const visible = useMemo(() => {
    const filtered = items.filter(
      (i) =>
        (status === "todos" || i.status === status) &&
        (priority === "todas" || i.priority === priority),
    );
    return filtered.sort((a, b) =>
      sort === "valor"
        ? itemTotal(b) - itemTotal(a)
        : priorityRank(a.priority) - priorityRank(b.priority) || itemTotal(b) - itemTotal(a),
    );
  }, [items, status, priority, sort]);

  async function remove(id: string) {
    try {
      await deleteItem(id);
      toast.success("Item removido.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível remover o item.");
    }
  }

  async function undo(id: string) {
    try {
      await unmarkPurchased(id);
      toast.success("Item voltou para a lista de desejos.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível desfazer a compra.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader icon={ShoppingBag} active="/lista" />

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
        {loading ? (
          <BalancesSkeleton />
        ) : (
          <>
            <section className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">Lista de compras</h1>
                <p className="text-sm text-muted-foreground">
                  Planeje seus desejos e lance a despesa quando comprar.
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Novo item
              </Button>
            </section>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Total estimado (pendentes)"
                value={formatBRL(stats.pendingTotal)}
                hint={`${stats.pendingCount} item(ns) na lista`}
              />
              <StatCard
                label="Já comprado"
                value={formatBRL(stats.boughtTotal)}
                hint={`${stats.boughtCount} item(ns) concluído(s)`}
              />
              <StatCard label="Itens no total" value={String(items.length)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desejado">Desejados</SelectItem>
                  <SelectItem value="comprado">Comprados</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas prioridades</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prioridade">Ordenar por prioridade</SelectItem>
                  <SelectItem value="valor">Ordenar por valor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {visible.length === 0 ? (
              <Card>
                <CardContent className="grid place-items-center gap-3 p-10 text-center">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Nenhum item por aqui</p>
                    <p className="text-sm text-muted-foreground">
                      Adicione o que você quer comprar e acompanhe o total estimado.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {visible.map((i) => (
                  <div key={i.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[i.store, i.quantity > 1 ? `${i.quantity}x` : null]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        style={{ borderColor: priorityColor(i.priority), color: priorityColor(i.priority) }}
                      >
                        {priorityLabel(i.priority)}
                      </Badge>
                    </div>

                    <p className="mt-3 text-xl font-semibold tabular-nums">
                      {formatBRL(itemTotal(i))}
                    </p>
                    {i.notes && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.notes}</p>
                    )}
                    {i.status === "comprado" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Comprado em {i.purchasedAt ?? "—"}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1">
                      {i.url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={i.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1 h-3.5 w-3.5" />
                            Link
                          </a>
                        </Button>
                      )}
                      {i.status === "desejado" ? (
                        <Button size="sm" onClick={() => setPurchasing(i)}>
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Comprei
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => void undo(i.id)}>
                          <Undo2 className="mr-1 h-3.5 w-3.5" />
                          Desfazer
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(i);
                          setFormOpen(true);
                        }}
                        aria-label="Editar item"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void remove(i.id)}
                        aria-label="Excluir item"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <ShoppingItemDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <PurchaseDialog item={purchasing} onOpenChange={(v) => !v && setPurchasing(null)} />
      <Toaster />
    </div>
  );
}

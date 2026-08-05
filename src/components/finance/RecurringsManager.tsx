import { useState } from "react";
import { CalendarClock, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFinance } from "@/lib/finance-store";
import {
  paymentMethods,
  type PaymentMethod,
  type Recurring,
  type TxType,
} from "@/lib/finance-data";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface Draft {
  id?: string;
  type: TxType;
  amountText: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  accountId?: string;
  paymentMethod: PaymentMethod;
  dayOfMonth: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const emptyDraft: Draft = {
  type: "expense",
  amountText: "",
  description: "",
  categoryId: "",
  subcategoryId: undefined,
  accountId: undefined,
  paymentMethod: "outro",
  dayOfMonth: 5,
  startDate: todayISO(),
  endDate: "",
  active: true,
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function RecurringsManager({ open, onOpenChange }: Props) {
  const {
    recurrings,
    categories,
    accounts,
    addRecurring,
    updateRecurring,
    deleteRecurring,
  } = useFinance();
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const typeCategories = categories.filter((c) => c.type === draft.type);
  const selectedCat = typeCategories.find((c) => c.id === draft.categoryId);

  function reset() {
    setDraft(emptyDraft);
  }

  function startEdit(r: Recurring) {
    setDraft({
      id: r.id,
      type: r.type,
      amountText: String(r.amount),
      description: r.description,
      categoryId: r.categoryId,
      subcategoryId: r.subcategoryId,
      accountId: r.accountId,
      paymentMethod: r.paymentMethod,
      dayOfMonth: r.dayOfMonth,
      startDate: r.startDate,
      endDate: r.endDate ?? "",
      active: r.active,
    });
  }

  async function submit() {
    const amount = Number(draft.amountText.replace(",", "."));
    if (!draft.description.trim() || !draft.categoryId || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Preencha descrição, valor e categoria");
      return;
    }
    const payload = {
      type: draft.type,
      amount,
      description: draft.description.trim(),
      categoryId: draft.categoryId,
      subcategoryId: draft.subcategoryId,
      accountId: draft.accountId,
      paymentMethod: draft.paymentMethod,
      dayOfMonth: Math.min(Math.max(Number(draft.dayOfMonth) || 1, 1), 31),
      startDate: draft.startDate,
      endDate: draft.endDate || undefined,
      active: draft.active,
    };
    try {
      if (draft.id) {
        await updateRecurring(draft.id, payload);
        toast.success("Recorrência atualizada");
      } else {
        await addRecurring(payload);
        toast.success("Recorrência criada — lançamentos gerados");
      }
      reset();
    } catch {
      toast.error("Não foi possível salvar a recorrência");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Lançamentos recorrentes
          </DialogTitle>
          <DialogDescription>
            Configure valores fixos mensais (plano de celular, aluguel, salário). O lançamento é
            criado automaticamente todo mês, no dia escolhido.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {draft.id ? "Editar recorrência" : "Nova recorrência"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={draft.type}
                onValueChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    type: v as TxType,
                    categoryId: "",
                    subcategoryId: undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="income">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Valor mensal</Label>
              <Input
                inputMode="decimal"
                placeholder="Ex: 59,90"
                value={draft.amountText}
                onChange={(e) => setDraft((d) => ({ ...d, amountText: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Plano de celular"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={draft.categoryId}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, categoryId: v, subcategoryId: undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {typeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subcategoria</Label>
              <Select
                value={draft.subcategoryId ?? "none"}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, subcategoryId: v === "none" ? undefined : v }))
                }
                disabled={!selectedCat || selectedCat.subcategories.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {selectedCat?.subcategories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Saldo / conta</Label>
              <Select
                value={draft.accountId ?? "none"}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, accountId: v === "none" ? undefined : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select
                value={draft.paymentMethod}
                onValueChange={(v) => setDraft((d) => ({ ...d, paymentMethod: v as PaymentMethod }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Dia do mês</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={draft.dayOfMonth}
                onChange={(e) => setDraft((d) => ({ ...d, dayOfMonth: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fim (opcional)</Label>
              <Input
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={draft.active}
                  onCheckedChange={(v) => setDraft((d) => ({ ...d, active: v }))}
                />
                <span className="text-sm text-muted-foreground">Ativa</span>
              </div>
              <div className="flex gap-2">
                {draft.id && (
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <X className="mr-1 h-4 w-4" />
                    Cancelar
                  </Button>
                )}
                <Button size="sm" onClick={() => void submit()}>
                  <Plus className="mr-1 h-4 w-4" />
                  {draft.id ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {recurrings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma recorrência cadastrada ainda.
            </p>
          )}
          {recurrings.map((r) => {
            const cat = categories.find((c) => c.id === r.categoryId);
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {r.description}
                    {!r.active && (
                      <span className="ml-2 text-xs text-muted-foreground">(pausada)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.type === "income" ? "Receita" : "Despesa"} · {brl(r.amount)} · todo dia{" "}
                    {r.dayOfMonth} · {cat?.name ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      void deleteRecurring(r.id);
                      toast.success("Recorrência removida");
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

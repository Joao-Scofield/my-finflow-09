import { useState } from "react";
import { CreditCard, Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/lib/finance-store";
import {
  cardInvoiceFor,
  debtInstallmentMonth,
  formatBRL,
  monthNamesPt,
  monthsBetween,
  type Card,
  type Debt,
} from "@/lib/finance-data";

const cardColors = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6"];

const pad = (n: number) => String(n).padStart(2, "0");

/** data de vencimento dentro do mês, ajustando dias que não existem (ex.: 31 em fevereiro) */
function dateBR(ym: string, day: number) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${pad(Math.min(day, last))}/${pad(m)}/${y}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${monthNamesPt[m - 1]} de ${y}`;
}

function currentYM() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function CardsSection({ ym }: { ym: string }) {
  const { cards, transactions, cardInvoicePayments, setCardInvoicePaid, deleteCard } = useFinance();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);

  function run(op: Promise<void>, message: string) {
    op.catch((e) => {
      console.error(e);
      toast.error(message);
    });
  }

  function remove(card: Card) {
    if (!window.confirm(`Excluir o cartão "${card.name}"? As compras continuam no histórico.`)) {
      return;
    }
    run(deleteCard(card.id), "Não foi possível excluir o cartão");
  }

  return (
    <>
      <UiCard>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Cartões e faturas
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Cartão
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {cards.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum cartão cadastrado. Cadastre o dia de fechamento e o dia de vencimento de cada
              fatura. Ao lançar uma compra no crédito, escolha o cartão.
            </p>
          )}
          {cards.map((card) => {
            const invoice = cardInvoiceFor(card, ym, transactions, cardInvoicePayments);
            return (
              <div
                key={card.id}
                className="grid gap-2 rounded-lg border p-3"
                style={{ borderLeft: `4px solid ${card.color}` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{card.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Fecha dia {card.closingDay} · vence {dateBR(ym, card.dueDay)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{formatBRL(invoice.total)}</p>
                    <Badge variant={invoice.paid ? "secondary" : "outline"}>
                      {invoice.paid ? "Paga" : "Em aberto"}
                    </Badge>
                  </div>
                </div>

                {invoice.purchases.length > 0 && (
                  <ul className="grid gap-1 text-sm">
                    {invoice.purchases.slice(0, 5).map((t) => (
                      <li key={t.id} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-muted-foreground">
                          {t.description || "Compra"}
                        </span>
                        <span className="tabular-nums">{formatBRL(t.amount)}</span>
                      </li>
                    ))}
                    {invoice.purchases.length > 5 && (
                      <li className="text-xs text-muted-foreground">
                        + {invoice.purchases.length - 5} compra(s)
                      </li>
                    )}
                  </ul>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={invoice.paid ? "outline" : "default"}
                    disabled={invoice.total === 0 && !invoice.paid}
                    onClick={() =>
                      run(
                        setCardInvoicePaid(card.id, ym, !invoice.paid),
                        "Não foi possível atualizar a fatura",
                      )
                    }
                  >
                    {invoice.paid ? "Desfazer pagamento" : "Marcar fatura como paga"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(card);
                      setFormOpen(true);
                    }}
                    aria-label={`Editar ${card.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(card)}
                    aria-label={`Excluir ${card.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </UiCard>

      <CardForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />
    </>
  );
}

function CardForm({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Card | null;
}) {
  const { addCard, updateCard } = useFinance();
  const [name, setName] = useState("");
  const [closingDay, setClosingDay] = useState("10");
  const [dueDay, setDueDay] = useState("20");
  const [color, setColor] = useState(cardColors[0]);

  // reinicia o formulário sempre que abre
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(editing?.name ?? "");
      setClosingDay(String(editing?.closingDay ?? 10));
      setDueDay(String(editing?.dueDay ?? 20));
      setColor(editing?.color ?? cardColors[0]);
    }
  }

  const closing = Number(closingDay);
  const due = Number(dueDay);
  const valid =
    name.trim().length > 0 &&
    Number.isInteger(closing) &&
    closing >= 1 &&
    closing <= 31 &&
    Number.isInteger(due) &&
    due >= 1 &&
    due <= 31;

  function save() {
    if (!valid) return;
    const payload = { name: name.trim(), closingDay: closing, dueDay: due, color };
    const op = editing ? updateCard(editing.id, payload) : addCard(payload);
    op.catch((e) => {
      console.error(e);
      toast.error("Não foi possível salvar o cartão");
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cartão" : "Novo cartão"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="card-name">Nome</Label>
            <Input
              id="card-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Nubank"
              maxLength={80}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="card-closing">Dia do fechamento</Label>
              <Input
                id="card-closing"
                type="number"
                min={1}
                max={31}
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="card-due">Dia do vencimento</Label>
              <Input
                id="card-due"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Compras até o dia do fechamento entram na fatura daquele mês. Depois do fechamento, vão
            para a fatura seguinte.
          </p>
          <div>
            <Label className="mb-2 block">Cor</Label>
            <div className="flex flex-wrap gap-2">
              {cardColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "currentColor" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!valid}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DebtsSection() {
  const { debts, payDebtInstallment, deleteDebt } = useFinance();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const now = currentYM();

  function run(op: Promise<void>, message: string) {
    op.catch((e) => {
      console.error(e);
      toast.error(message);
    });
  }

  function remove(debt: Debt) {
    if (!window.confirm(`Excluir a dívida "${debt.name}"?`)) return;
    run(deleteDebt(debt.id), "Não foi possível excluir a dívida");
  }

  return (
    <>
      <UiCard>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4" />
            Dívidas e parcelas
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Dívida
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          {debts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma dívida cadastrada. Lance o valor da parcela, não o total.
            </p>
          )}
          {debts.map((debt) => {
            const done = debt.installmentsPaid >= debt.installmentsTotal;
            const nextMonth = done ? null : debtInstallmentMonth(debt, debt.installmentsPaid + 1);
            const diff = nextMonth ? monthsBetween(nextMonth, now) : 0;
            const status = done
              ? { label: "Quitada", variant: "secondary" as const }
              : diff > 0
                ? { label: "Atrasada", variant: "destructive" as const }
                : diff === 0
                  ? { label: "Vence neste mês", variant: "default" as const }
                  : { label: `Próxima: ${monthLabel(nextMonth!)}`, variant: "outline" as const };
            const progress = (debt.installmentsPaid / debt.installmentsTotal) * 100;
            return (
              <div key={debt.id} className="grid gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{debt.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Parcela {debt.installmentsPaid} de {debt.installmentsTotal} ·{" "}
                      {formatBRL(debt.installmentAmount)} por mês
                    </p>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={done}
                    onClick={() =>
                      run(payDebtInstallment(debt.id, true), "Não foi possível marcar a parcela")
                    }
                  >
                    Marcar parcela paga
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={debt.installmentsPaid === 0}
                    onClick={() =>
                      run(payDebtInstallment(debt.id, false), "Não foi possível desfazer")
                    }
                  >
                    Desfazer última
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(debt);
                      setFormOpen(true);
                    }}
                    aria-label={`Editar ${debt.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(debt)}
                    aria-label={`Excluir ${debt.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </UiCard>

      <DebtForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />
    </>
  );
}

function DebtForm({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Debt | null;
}) {
  const { addDebt, updateDebt } = useFinance();
  const [name, setName] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentsTotal, setInstallmentsTotal] = useState("");
  const [installmentsPaid, setInstallmentsPaid] = useState("0");
  const [firstDueDate, setFirstDueDate] = useState("");

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(editing?.name ?? "");
      setInstallmentAmount(editing ? String(editing.installmentAmount) : "");
      setInstallmentsTotal(editing ? String(editing.installmentsTotal) : "");
      setInstallmentsPaid(String(editing?.installmentsPaid ?? 0));
      setFirstDueDate(editing?.firstDueDate ?? new Date().toISOString().slice(0, 10));
    }
  }

  const amount = Number(installmentAmount.replace(",", "."));
  const total = Number(installmentsTotal);
  const paid = Number(installmentsPaid);
  const valid =
    name.trim().length > 0 &&
    amount > 0 &&
    Number.isInteger(total) &&
    total >= 1 &&
    Number.isInteger(paid) &&
    paid >= 0 &&
    paid <= total &&
    /^\d{4}-\d{2}-\d{2}$/.test(firstDueDate);

  function save() {
    if (!valid) return;
    const op = editing
      ? updateDebt(editing.id, {
          name: name.trim(),
          installmentAmount: amount,
          installmentsTotal: total,
          installmentsPaid: paid,
          firstDueDate,
        })
      : addDebt({
          name: name.trim(),
          installmentAmount: amount,
          installmentsTotal: total,
          firstDueDate,
        });
    op.catch((e) => {
      console.error(e);
      toast.error("Não foi possível salvar a dívida");
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar dívida" : "Nova dívida"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="debt-name">Nome</Label>
            <Input
              id="debt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Financiamento do carro"
              maxLength={80}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="debt-amount">Valor da parcela (R$)</Label>
              <Input
                id="debt-amount"
                inputMode="decimal"
                value={installmentAmount}
                onChange={(e) => setInstallmentAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="debt-total">Total de parcelas</Label>
              <Input
                id="debt-total"
                type="number"
                min={1}
                value={installmentsTotal}
                onChange={(e) => setInstallmentsTotal(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="debt-first">Vencimento da 1ª parcela</Label>
              <Input
                id="debt-first"
                type="date"
                value={firstDueDate}
                onChange={(e) => setFirstDueDate(e.target.value)}
              />
            </div>
            {editing && (
              <div>
                <Label htmlFor="debt-paid">Parcelas já pagas</Label>
                <Input
                  id="debt-paid"
                  type="number"
                  min={0}
                  value={installmentsPaid}
                  onChange={(e) => setInstallmentsPaid(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!valid}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

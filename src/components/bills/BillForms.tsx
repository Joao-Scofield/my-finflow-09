import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { useFinance } from "@/lib/finance-store";
import { paymentMethods, type PaymentMethod } from "@/lib/finance-data";
import { todayISO, type Bill } from "@/lib/bills-data";
import { useBills } from "@/lib/bills-store";

const NONE = "none";

export function BillDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Bill | null;
}) {
  const { categories, accounts } = useFinance();
  const { addBill, updateBill } = useBills();
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [recurring, setRecurring] = useState(true);
  const [categoryId, setCategoryId] = useState<string>(NONE);
  const [accountId, setAccountId] = useState<string>(NONE);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("boleto");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setDueDate(editing?.dueDate ?? todayISO());
    setRecurring(editing?.recurring ?? true);
    setCategoryId(editing?.categoryId ?? NONE);
    setAccountId(editing?.accountId ?? NONE);
    setPaymentMethod(editing?.paymentMethod ?? "boleto");
    setNotes(editing?.notes ?? "");
  }, [open, editing]);

  async function submit() {
    if (!name.trim()) {
      toast.error("Informe o nome da conta.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        amount: Number(amount.replace(",", ".")) || 0,
        dueDate,
        recurring,
        categoryId: categoryId === NONE ? undefined : categoryId,
        accountId: accountId === NONE ? undefined : accountId,
        paymentMethod,
        notes: notes.trim(),
      };
      if (editing) await updateBill(editing.id, payload);
      else await addBill(payload);
      toast.success(editing ? "Conta atualizada." : "Conta cadastrada.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar a conta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar conta" : "Nova conta"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="bill-name">Conta</Label>
            <Input
              id="bill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Plano de celular"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bill-amount">Valor</Label>
              <Input
                id="bill-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bill-due">Vencimento</Label>
              <Input
                id="bill-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Forma de pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Automática (Contas)</SelectItem>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Sai do saldo</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não definir</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={recurring} onCheckedChange={(v) => setRecurring(Boolean(v))} />
            Repete todo mês (ao dar baixa, gera a próxima automaticamente)
          </label>

          <div className="grid gap-1.5">
            <Label htmlFor="bill-notes">Observações</Label>
            <Textarea
              id="bill-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayBillDialog({
  bill,
  onOpenChange,
}: {
  bill: Bill | null;
  onOpenChange: (v: boolean) => void;
}) {
  const { markPaid } = useBills();
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bill) setDate(todayISO());
  }, [bill]);

  async function confirm() {
    if (!bill) return;
    setSaving(true);
    try {
      await markPaid(bill.id, date);
      toast.success("Conta paga e despesa lançada.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível dar baixa na conta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(bill)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como paga</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Vamos lançar a despesa de <strong>{bill?.name}</strong> no seu fluxo de caixa.
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="pay-date">Data do pagamento</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void confirm()} disabled={saving}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

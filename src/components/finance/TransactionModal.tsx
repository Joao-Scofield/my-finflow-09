import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useFinance } from "@/lib/finance-store";
import {
  paymentMethods,
  type PaymentMethod,
  type Transaction,
  type TxType,
} from "@/lib/finance-data";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Transaction | null;
  defaultDate?: string;
}

export function TransactionModal({ open, onOpenChange, editing, defaultDate }: Props) {
  const { categories, accounts, addTransaction, updateTransaction } = useFinance();

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [paid, setPaid] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setDate(editing.date);
      setCategoryId(editing.categoryId);
      setSubcategoryId(editing.subcategoryId ?? "");
      setDescription(editing.description);
      setPaid(editing.status === "paid");
      setPaymentMethod(editing.paymentMethod ?? "outro");
      setAccountId(editing.accountId ?? "");
    } else {
      setType("expense");
      setAmount("");
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setCategoryId("");
      setSubcategoryId("");
      setDescription("");
      setPaid(true);
      setPaymentMethod("pix");
      setAccountId(accounts.length === 1 ? accounts[0].id : "");
    }
  }, [open, editing, defaultDate, accounts]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  const currentCategory = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    // reset category when switching type if not compatible
    if (categoryId && currentCategory && currentCategory.type !== type) {
      setCategoryId("");
      setSubcategoryId("");
    }
  }, [type, categoryId, currentCategory]);

  const canSave =
    amount && Number(amount) > 0 && date && categoryId && (accounts.length === 0 || accountId);

  function save() {
    if (!canSave) return;
    const payload = {
      type,
      amount: Number(amount),
      date,
      categoryId,
      subcategoryId: subcategoryId || undefined,
      description,
      status: paid ? ("paid" as const) : ("pending" as const),
      paymentMethod,
      accountId: accountId || undefined,
    };
    if (editing) updateTransaction(editing.id, payload);
    else addTransaction(payload);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar transação" : "Nova transação"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label className="mb-2 block">Tipo</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as TxType)}
              className="grid grid-cols-2 gap-2"
            >
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                  type === "income" ? "border-income bg-income/10 text-income" : ""
                }`}
              >
                <RadioGroupItem value="income" />
                Receita
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                  type === "expense" ? "border-expense bg-expense/10 text-expense" : ""
                }`}
              >
                <RadioGroupItem value="expense" />
                Despesa
              </label>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v);
                  setSubcategoryId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subcategoria</Label>
              <Select
                value={subcategoryId}
                onValueChange={setSubcategoryId}
                disabled={!currentCategory || currentCategory.subcategories.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      currentCategory && currentCategory.subcategories.length > 0
                        ? "Selecione"
                        : "—"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {currentCategory?.subcategories.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Forma de pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: m.color }} />
                      {m.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Saldo (conta)</Label>
            <Select value={accountId} onValueChange={setAccountId} disabled={accounts.length === 0}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    accounts.length === 0 ? "Cadastre um saldo primeiro" : "Selecione o saldo"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: a.color }} />
                      {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {type === "income"
                ? "O valor entra nesse saldo automaticamente."
                : "O valor sai desse saldo automaticamente."}
            </p>
          </div>

          <div>
            <Label htmlFor="desc">Descrição</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Observação..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm">Status</Label>
              <p className="text-xs text-muted-foreground">
                {paid ? "Pago / Recebido" : "Pendente"}
              </p>
            </div>
            <Switch checked={paid} onCheckedChange={setPaid} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

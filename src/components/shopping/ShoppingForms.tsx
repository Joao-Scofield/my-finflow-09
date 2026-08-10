import { useEffect, useState } from "react";

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
import { shoppingPriorities, type ShoppingItem, type ShoppingPriority } from "@/lib/shopping-data";
import { useShopping } from "@/lib/shopping-store";
import { toast } from "sonner";

const NONE = "none";
const today = () => new Date().toISOString().slice(0, 10);

export function ShoppingItemDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ShoppingItem | null;
}) {
  const { categories } = useFinance();
  const { addItem, updateItem } = useShopping();
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [url, setUrl] = useState("");
  const [store, setStore] = useState("");
  const [priority, setPriority] = useState<ShoppingPriority>("media");
  const [categoryId, setCategoryId] = useState<string>(NONE);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setAmount(editing ? String(editing.estimatedAmount) : "");
    setQuantity(String(editing?.quantity ?? 1));
    setUrl(editing?.url ?? "");
    setStore(editing?.store ?? "");
    setPriority(editing?.priority ?? "media");
    setCategoryId(editing?.categoryId ?? NONE);
    setNotes(editing?.notes ?? "");
  }, [open, editing]);

  async function submit() {
    if (!name.trim()) {
      toast.error("Informe o nome do item.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        estimatedAmount: Number(amount.replace(",", ".")) || 0,
        quantity: Math.max(1, Number(quantity) || 1),
        url: url.trim(),
        store: store.trim(),
        priority,
        categoryId: categoryId === NONE ? undefined : categoryId,
        notes: notes.trim(),
      };
      if (editing) await updateItem(editing.id, payload);
      else await addItem(payload);
      toast.success(editing ? "Item atualizado." : "Item adicionado à lista.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível salvar o item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar item" : "Novo item"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="si-name">Item</Label>
            <Input
              id="si-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Monitor 27 polegadas"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="si-amount">Valor estimado</Label>
              <Input
                id="si-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="si-qty">Quantidade</Label>
              <Input
                id="si-qty"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ShoppingPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {shoppingPriorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="si-store">Loja</Label>
              <Input
                id="si-store"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="Ex.: Amazon"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Categoria (opcional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem categoria</SelectItem>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="si-url">Link de compra</Label>
            <Input
              id="si-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="si-notes">Observações</Label>
            <Textarea
              id="si-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PurchaseDialog({
  item,
  onOpenChange,
}: {
  item: ShoppingItem | null;
  onOpenChange: (v: boolean) => void;
}) {
  const { accounts, categories } = useFinance();
  const { markPurchased } = useShopping();
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const [post, setPost] = useState(true);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [accountId, setAccountId] = useState<string>(NONE);
  const [categoryId, setCategoryId] = useState<string>(NONE);
  const [method, setMethod] = useState<PaymentMethod>("credito");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setPost(true);
    setAmount(String(item.estimatedAmount * Math.max(1, item.quantity)));
    setDate(today());
    setAccountId(accounts[0]?.id ?? NONE);
    setCategoryId(item.categoryId ?? NONE);
    setMethod("credito");
  }, [item, accounts]);

  async function submit() {
    if (!item) return;
    setSaving(true);
    try {
      await markPurchased(item.id, {
        post,
        amount: Number(amount.replace(",", ".")) || 0,
        date,
        accountId: accountId === NONE ? undefined : accountId,
        categoryId: categoryId === NONE ? undefined : categoryId,
        paymentMethod: method,
      });
      toast.success(
        post ? "Item comprado e lançado no financeiro." : "Item marcado como comprado.",
      );
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível concluir a compra.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como comprado</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">{item?.name}</p>
          <div className="flex items-center gap-2">
            <Checkbox id="pd-post" checked={post} onCheckedChange={(v) => setPost(Boolean(v))} />
            <Label htmlFor="pd-post" className="text-sm font-normal">
              Lançar despesa no financeiro
            </Label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pd-amount">Valor pago</Label>
              <Input
                id="pd-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!post}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pd-date">Data</Label>
              <Input
                id="pd-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          {post && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Saldo / conta</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem conta</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Compras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Compras (padrão)</SelectItem>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Forma de pagamento</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            Confirmar compra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

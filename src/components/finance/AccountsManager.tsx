import { useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinance } from "@/lib/finance-store";
import { accountKinds, accountKindLabel, formatBRL, type AccountKind } from "@/lib/finance-data";

const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#8b5cf6", "#ef4444"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountsManager({ open, onOpenChange }: Props) {
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinance();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("dinheiro");
  const [balance, setBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const total = accounts.reduce((s, a) => s + a.balance, 0);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addAccount({
        name: name.trim(),
        kind,
        initialBalance: Number(balance || 0),
        color: colors[accounts.length % colors.length],
      });
      setName("");
      setBalance("");
      toast.success("Saldo adicionado.");
    } catch {
      toast.error("Não foi possível salvar o saldo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gestão de saldos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Patrimônio total (atualizado pelos lançamentos)
            </span>
            <span className="text-lg font-semibold tabular-nums">{formatBRL(total)}</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_150px_130px_auto]">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Dinheiro físico"
              />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as AccountKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountKinds.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Saldo inicial (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={saving || !name.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {accounts.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum saldo cadastrado ainda.
              </p>
            )}
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: a.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{accountKindLabel(a.kind)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Saldo atual</p>
                  <p className="text-sm font-semibold tabular-nums">{formatBRL(a.balance)}</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] text-muted-foreground">Inicial</p>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={a.initialBalance}
                    className="w-28 tabular-nums"
                    onBlur={(e) => {
                      const next = Number(e.target.value || 0);
                      if (next !== a.initialBalance)
                        void updateAccount(a.id, { initialBalance: next });
                    }}
                  />
                </div>
                <Button size="icon" variant="ghost" onClick={() => void deleteAccount(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

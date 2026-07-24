import { useMemo, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFinance } from "@/lib/finance-store";
import { formatBRL, type Transaction } from "@/lib/finance-data";
import { cn } from "@/lib/utils";

interface Props {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
}

export function TransactionsTable({ transactions, onEdit }: Props) {
  const { categories, deleteTransaction } = useFinance();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [subFilter, setSubFilter] = useState<string>("all");

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const subOptions = useMemo(() => {
    if (catFilter === "all") return [];
    return catMap.get(catFilter)?.subcategories ?? [];
  }, [catFilter, catMap]);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => {
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (catFilter !== "all" && t.categoryId !== catFilter) return false;
        if (subFilter !== "all" && t.subcategoryId !== subFilter) return false;
        if (q && !t.description.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, typeFilter, catFilter, subFilter, q]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar transação..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={catFilter}
          onValueChange={(v) => {
            setCatFilter(v);
            setSubFilter("all");
          }}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={subFilter}
          onValueChange={setSubFilter}
          disabled={subOptions.length === 0}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Subcategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas subcategorias</SelectItem>
            {subOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((t) => {
              const cat = catMap.get(t.categoryId);
              const sub = cat?.subcategories.find((s) => s.id === t.subcategoryId);
              return (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="truncate font-medium">{t.description || "—"}</div>
                    {sub && (
                      <div className="text-xs text-muted-foreground">{sub.name}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat?.color ?? "#888" }}
                      />
                      {cat?.name ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        t.status === "paid"
                          ? "border-income/40 bg-income/10 text-income"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {t.status === "paid" ? "Pago" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "whitespace-nowrap text-right font-semibold tabular-nums",
                      t.type === "income" ? "text-income" : "text-expense",
                    )}
                  >
                    {t.type === "income" ? "+" : "-"} {formatBRL(t.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteTransaction(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

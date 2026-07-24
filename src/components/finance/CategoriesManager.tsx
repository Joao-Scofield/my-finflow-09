import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFinance } from "@/lib/finance-store";
import type { Category, TxType } from "@/lib/finance-data";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#a855f7",
  "#f97316",
  "#84cc16",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CategoriesManager({ open, onOpenChange }: Props) {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useFinance();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newType, setNewType] = useState<TxType>("expense");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [newSubByCat, setNewSubByCat] = useState<Record<string, string>>({});
  const [editingSub, setEditingSub] = useState<{ catId: string; subId: string; name: string } | null>(
    null,
  );

  function commitEditCat(c: Category) {
    if (editingCatName.trim()) {
      updateCategory(c.id, { name: editingCatName.trim() });
    }
    setEditingCatId(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Categorias e subcategorias</DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nova categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <Label htmlFor="cat-name">Nome</Label>
                <Input
                  id="cat-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Pets"
                />
              </div>
              <div>
                <Label className="mb-2 block">Tipo</Label>
                <RadioGroup
                  value={newType}
                  onValueChange={(v) => setNewType(v as TxType)}
                  className="flex gap-3"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="expense" /> Despesa
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value="income" /> Receita
                  </label>
                </RadioGroup>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      newColor === c ? "scale-110 border-foreground" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={() => {
                if (!newName.trim()) return;
                addCategory({ name: newName.trim(), color: newColor, icon: "Tag", type: newType });
                setNewName("");
              }}
              disabled={!newName.trim()}
            >
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {editingCatId === cat.id ? (
                    <Input
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                  ) : (
                    <CardTitle className="truncate text-base">{cat.name}</CardTitle>
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {cat.type === "income" ? "Receita" : "Despesa"}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  {editingCatId === cat.id ? (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => commitEditCat(cat)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingCatId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatName(cat.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteCategory(cat.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {cat.subcategories.map((s) =>
                    editingSub && editingSub.subId === s.id ? (
                      <div key={s.id} className="flex items-center gap-1 rounded-md border p-1">
                        <Input
                          value={editingSub.name}
                          onChange={(e) =>
                            setEditingSub({ ...editingSub, name: e.target.value })
                          }
                          className="h-7 w-32"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            if (editingSub.name.trim())
                              updateSubcategory(cat.id, s.id, editingSub.name.trim());
                            setEditingSub(null);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span
                        key={s.id}
                        className="group inline-flex items-center gap-1 rounded-full border bg-muted/40 py-1 pl-3 pr-1 text-sm"
                      >
                        {s.name}
                        <button
                          onClick={() =>
                            setEditingSub({ catId: cat.id, subId: s.id, name: s.name })
                          }
                          className="rounded-full p-1 hover:bg-background"
                          aria-label="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteSubcategory(cat.id, s.id)}
                          className="rounded-full p-1 hover:bg-background"
                          aria-label="Remover"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ),
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova subcategoria"
                    value={newSubByCat[cat.id] ?? ""}
                    onChange={(e) =>
                      setNewSubByCat({ ...newSubByCat, [cat.id]: e.target.value })
                    }
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = (newSubByCat[cat.id] ?? "").trim();
                        if (v) {
                          addSubcategory(cat.id, v);
                          setNewSubByCat({ ...newSubByCat, [cat.id]: "" });
                        }
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const v = (newSubByCat[cat.id] ?? "").trim();
                      if (v) {
                        addSubcategory(cat.id, v);
                        setNewSubByCat({ ...newSubByCat, [cat.id]: "" });
                      }
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

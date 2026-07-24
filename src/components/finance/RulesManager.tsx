import { useState } from "react";
import { Pencil, Plus, Sparkles, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useFinance } from "@/lib/finance-store";
import type { Rule } from "@/lib/finance-data";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface DraftRule {
  id?: string;
  name: string;
  keywordsText: string;
  categoryId: string;
  subcategoryId?: string;
  priority: number;
  enabled: boolean;
}

const emptyDraft: DraftRule = {
  name: "",
  keywordsText: "",
  categoryId: "",
  subcategoryId: undefined,
  priority: 50,
  enabled: true,
};

export function RulesManager({ open, onOpenChange }: Props) {
  const { rules, categories, addRule, updateRule, deleteRule, reapplyRulesAll } = useFinance();
  const [draft, setDraft] = useState<DraftRule>(emptyDraft);

  const selectedCat = categories.find((c) => c.id === draft.categoryId);

  function startEdit(r: Rule) {
    setDraft({
      id: r.id,
      name: r.name,
      keywordsText: r.keywords.join(", "),
      categoryId: r.categoryId,
      subcategoryId: r.subcategoryId,
      priority: r.priority,
      enabled: r.enabled,
    });
  }

  function reset() {
    setDraft(emptyDraft);
  }

  function submit() {
    const keywords = draft.keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (!draft.name.trim() || !draft.categoryId || keywords.length === 0) {
      toast.error("Preencha nome, categoria e ao menos uma palavra-chave");
      return;
    }
    const payload = {
      name: draft.name.trim(),
      keywords,
      categoryId: draft.categoryId,
      subcategoryId: draft.subcategoryId,
      priority: Number.isFinite(draft.priority) ? draft.priority : 50,
      enabled: draft.enabled,
    };
    if (draft.id) {
      updateRule(draft.id, payload);
      toast.success("Regra atualizada");
    } else {
      addRule(payload);
      toast.success("Regra criada");
    }
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Regras de categorização automática
          </DialogTitle>
          <DialogDescription>
            Quando a descrição de uma transação contiver alguma palavra-chave, a categoria e
            subcategoria da regra serão aplicadas automaticamente. Regras de maior prioridade
            vencem em caso de conflito.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {draft.id ? "Editar regra" : "Nova regra"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="rule-name">Nome</Label>
                <Input
                  id="rule-name"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Ex: Vale Refeição"
                />
              </div>
              <div>
                <Label htmlFor="rule-priority">Prioridade</Label>
                <Input
                  id="rule-priority"
                  type="number"
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({ ...draft, priority: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rule-keywords">
                Palavras-chave (separadas por vírgula)
              </Label>
              <Input
                id="rule-keywords"
                value={draft.keywordsText}
                onChange={(e) => setDraft({ ...draft, keywordsText: e.target.value })}
                placeholder="sodexo, ticket rest, alelo refeicao"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Comparação sem acentos e sem diferenciar maiúsculas.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={draft.categoryId}
                  onValueChange={(v) =>
                    setDraft({ ...draft, categoryId: v, subcategoryId: undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          {c.name}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({c.type === "income" ? "Receita" : "Despesa"})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategoria (opcional)</Label>
                <Select
                  value={draft.subcategoryId ?? "__none__"}
                  onValueChange={(v) =>
                    setDraft({
                      ...draft,
                      subcategoryId: v === "__none__" ? undefined : v,
                    })
                  }
                  disabled={!selectedCat}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nenhuma —</SelectItem>
                    {selectedCat?.subcategories.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={draft.enabled}
                onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
              />
              <span className="text-sm">Regra ativa</span>
            </div>

            <div className="flex gap-2">
              <Button onClick={submit}>
                {draft.id ? (
                  <>
                    <Check className="mr-1 h-4 w-4" /> Salvar
                  </>
                ) : (
                  <>
                    <Plus className="mr-1 h-4 w-4" /> Adicionar regra
                  </>
                )}
              </Button>
              {draft.id && (
                <Button variant="ghost" onClick={reset}>
                  Cancelar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {rules.length} {rules.length === 1 ? "regra cadastrada" : "regras cadastradas"}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const { updated } = reapplyRulesAll();
              toast.success(
                updated > 0
                  ? `Regras aplicadas: ${updated} transação(ões) atualizada(s)`
                  : "Nenhuma transação precisou ser alterada",
              );
            }}
          >
            <Sparkles className="mr-1 h-4 w-4" /> Reaplicar em tudo
          </Button>
        </div>

        <div className="space-y-2">
          {rules.length === 0 && (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma regra ainda. Crie a primeira acima.
            </p>
          )}
          {[...rules]
            .sort((a, b) => b.priority - a.priority)
            .map((r) => {
              const cat = categories.find((c) => c.id === r.categoryId);
              const sub = cat?.subcategories.find((s) => s.id === r.subcategoryId);
              return (
                <Card key={r.id} className={r.enabled ? "" : "opacity-60"}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          prio {r.priority}
                        </span>
                        {cat && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                            {sub ? ` › ${sub.name}` : ""}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {r.keywords.join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={r.enabled}
                        onCheckedChange={(v) => updateRule(r.id, { enabled: v })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => startEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          deleteRule(r.id);
                          toast.success("Regra removida");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" /> Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

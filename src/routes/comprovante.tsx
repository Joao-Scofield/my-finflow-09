import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, Loader2, Receipt, RefreshCw, Save, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { Login } from "@/components/finance/Login";
import { FinanceProvider, useFinance } from "@/lib/finance-store";
import { ThemeProvider } from "@/lib/theme";
import { paymentMethods, type PaymentMethod, type TxType } from "@/lib/finance-data";
import { readReceipt } from "@/lib/receipt.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/comprovante")({
  head: () => ({
    meta: [
      { title: "Importar Comprovante — Lançamento por foto" },
      {
        name: "description",
        content:
          "Envie a foto de um comprovante, deixe a inteligência artificial ler os dados e confirme o lançamento no seu financeiro.",
      },
      { property: "og:title", content: "Importar Comprovante — Lançamento por foto" },
      {
        property: "og:description",
        content: "Leitura automática de recibos com revisão antes de salvar a transação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReceiptRoute,
});

function ReceiptRoute() {
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
      <ReceiptPage />
    </FinanceProvider>
  );
}

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function ReceiptPage() {
  const { categories, accounts, addTransaction } = useFinance();
  const runRead = useServerFn(readReceipt);
  const inputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [readDone, setReadDone] = useState(false);

  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [paid, setPaid] = useState(true);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );
  const currentCategory = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    if (currentCategory && currentCategory.type !== type) {
      setCategoryId("");
      setSubcategoryId("");
    }
  }, [type, currentCategory]);

  useEffect(() => {
    if (!accountId && accounts.length === 1) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  function resetForm() {
    setType("expense");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setMerchant("");
    setDescription("");
    setCategoryId("");
    setSubcategoryId("");
    setPaymentMethod("pix");
    setPaid(true);
    setReadDone(false);
  }

  function clearAll() {
    setImageUrl(null);
    setFileName("");
    resetForm();
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Envie uma imagem JPG ou PNG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("A imagem é muito grande (máximo 8 MB).");
      return;
    }
    resetForm();
    const dataUrl = await fileToDataUrl(file);
    setImageUrl(dataUrl);
    setFileName(file.name);
    await analyze(dataUrl);
  }

  async function analyze(dataUrl: string) {
    setReading(true);
    try {
      const result = await runRead({
        data: { image: dataUrl, categories: categories.map((c) => c.name) },
      });
      setReadDone(true);

      if (result.date) setDate(result.date);
      if (result.amount) setAmount(String(result.amount));
      if (result.merchant) setMerchant(result.merchant);
      setDescription(result.description ?? result.merchant ?? "");

      if (result.paymentMethod) {
        const found = paymentMethods.find((p) => p.value === result.paymentMethod);
        if (found) setPaymentMethod(found.value);
      }

      if (result.categoryHint) {
        const hint = result.categoryHint.toLowerCase();
        const match = categories.find(
          (c) => c.type === "expense" && c.name.toLowerCase() === hint,
        );
        if (match) setCategoryId(match.id);
      }

      if (!result.amount && !result.merchant) {
        toast.warning("Não consegui ler o comprovante. Preencha os campos manualmente.");
      } else {
        toast.success("Comprovante lido! Revise os dados antes de salvar.");
      }
    } catch (error) {
      setReadDone(true);
      toast.error(error instanceof Error ? error.message : "Falha ao ler o comprovante.");
    } finally {
      setReading(false);
    }
  }

  const canSave =
    Boolean(amount) &&
    Number(amount) > 0 &&
    Boolean(date) &&
    Boolean(categoryId) &&
    (accounts.length === 0 || Boolean(accountId));

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await addTransaction({
        type,
        amount: Number(amount),
        date,
        categoryId,
        subcategoryId: subcategoryId || undefined,
        description: [description, merchant].filter(Boolean).join(" — ").slice(0, 140),
        status: paid ? "paid" : "pending",
        paymentMethod,
        accountId: accountId || undefined,
      });
      toast.success("Transação salva!");
      clearAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader icon={Receipt} active="/comprovante" />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">
        <div>
          <p className="text-sm text-muted-foreground">Lançamento por foto</p>
          <h1 className="gold-rule text-xl font-semibold tracking-tight sm:text-2xl">
            Importar comprovante
          </h1>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="bento-card">
            <CardHeader>
              <CardTitle className="text-base">Comprovante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!imageUrl ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleFile(file);
                  }}
                  className={`grid w-full place-items-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition ${
                    dragging ? "border-primary bg-accent/50" : "border-muted-foreground/25"
                  }`}
                >
                  <ImageUp className="h-8 w-8 text-muted-foreground" />
                  <span className="font-medium">Clique para escolher a foto</span>
                  <span className="text-sm text-muted-foreground">
                    ou arraste e solte aqui — JPG ou PNG, até 8 MB
                  </span>
                </button>
              ) : (
                <div className="relative overflow-hidden rounded-xl border">
                  <img
                    src={imageUrl}
                    alt={`Comprovante enviado${fileName ? `: ${fileName}` : ""}`}
                    className="max-h-[420px] w-full cursor-zoom-in bg-muted object-contain"
                    onClick={() => setZoom(true)}
                  />
                  {reading && (
                    <div className="absolute inset-0 grid place-items-center gap-2 bg-background/70 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        <p className="text-sm font-medium">Lendo o comprovante…</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />

              {imageUrl && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reading}
                    onClick={() => void analyze(imageUrl)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Ler novamente
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                    <ImageUp className="mr-2 h-4 w-4" />
                    Trocar imagem
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    <X className="mr-2 h-4 w-4" />
                    Limpar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bento-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Revisar e confirmar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!imageUrl && !readDone && (
                <p className="text-sm text-muted-foreground">
                  Envie a foto do comprovante para preencher os campos automaticamente. Você poderá
                  corrigir tudo antes de salvar.
                </p>
              )}

              <div>
                <Label className="mb-2 block">Tipo</Label>
                <RadioGroup
                  value={type}
                  onValueChange={(v) => setType(v as TxType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="expense" id="rc-expense" />
                    <Label htmlFor="rc-expense">Despesa</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="income" id="rc-income" />
                    <Label htmlFor="rc-income">Receita</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="rc-amount" className="mb-2 block">
                    Valor (R$)
                  </Label>
                  <Input
                    id="rc-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(",", "."))}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="rc-date" className="mb-2 block">
                    Data
                  </Label>
                  <Input
                    id="rc-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rc-merchant" className="mb-2 block">
                  Estabelecimento
                </Label>
                <Input
                  id="rc-merchant"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="Nome do local"
                />
              </div>

              <div>
                <Label htmlFor="rc-desc" className="mb-2 block">
                  Descrição
                </Label>
                <Textarea
                  id="rc-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="O que foi pago"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block">Categoria</Label>
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
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Subcategoria</Label>
                  <Select
                    value={subcategoryId}
                    onValueChange={setSubcategoryId}
                    disabled={!currentCategory?.subcategories.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block">Saldo / conta</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Forma de pagamento</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  >
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

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Já foi pago</p>
                  <p className="text-xs text-muted-foreground">Desligue para deixar pendente</p>
                </div>
                <Switch checked={paid} onCheckedChange={setPaid} />
              </div>

              <Button className="w-full" disabled={!canSave || saving || reading} onClick={save}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Confirmar e salvar
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {zoom && imageUrl && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
          onClick={() => setZoom(false)}
        >
          <img
            src={imageUrl}
            alt="Comprovante ampliado"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      <Toaster richColors position="top-right" />
    </div>
  );
}

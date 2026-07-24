import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useFinance, type ImportRow } from "@/lib/finance-store";
import { formatBRL } from "@/lib/finance-data";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type ColumnKey = "date" | "description" | "amount" | "type" | "category" | "subcategory" | "status";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: "Data",
  description: "Descrição",
  amount: "Valor",
  type: "Tipo",
  category: "Categoria",
  subcategory: "Subcategoria",
  status: "Status",
};

const HEADER_HINTS: Record<ColumnKey, string[]> = {
  date: ["data", "date", "dt", "vencimento", "pagamento"],
  description: ["descrição", "descricao", "description", "desc", "obs", "observação", "observacao", "histórico", "historico"],
  amount: ["valor", "amount", "value", "preço", "preco", "total"],
  type: ["tipo", "type", "operação", "operacao"],
  category: ["categoria", "category", "cat"],
  subcategory: ["subcategoria", "subcategory", "sub", "subcat"],
  status: ["status", "situação", "situacao", "pago"],
};

const norm = (s: string) =>
  s
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

function autoMap(headers: string[]): Partial<Record<ColumnKey, string>> {
  const map: Partial<Record<ColumnKey, string>> = {};
  const used = new Set<string>();
  (Object.keys(HEADER_HINTS) as ColumnKey[]).forEach((key) => {
    const hints = HEADER_HINTS[key];
    const match = headers.find((h) => !used.has(h) && hints.some((hint) => norm(h).includes(hint)));
    if (match) {
      map[key] = match;
      used.add(match);
    }
  });
  return map;
}

function parseDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  // ISO yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  // dd/mm/yyyy or dd-mm-yyyy
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (br) {
    let y = br[3];
    if (y.length === 2) y = "20" + y;
    return `${y}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

function parseAmount(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  let s = String(v).trim().replace(/[R$\s]/gi, "");
  // 1.234,56 -> 1234.56
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function parseType(v: unknown, amount: number): "income" | "expense" {
  const s = norm(String(v ?? ""));
  if (/receita|income|entrada|credit|\+/.test(s)) return "income";
  if (/despesa|expense|saida|saída|debit|-/.test(s)) return "expense";
  return amount < 0 ? "expense" : "expense";
}

function parseStatus(v: unknown): "paid" | "pending" {
  const s = norm(String(v ?? ""));
  if (/pend|open|aberto|não|nao|false|0/.test(s)) return "pending";
  return "paid";
}

interface ParsedRow {
  raw: Record<string, unknown>;
  row: ImportRow | null;
  error?: string;
}

export function ImportModal({ open, onOpenChange }: Props) {
  const { importRows } = useFinance();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState<string>("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ColumnKey, string>>>({});
  const [replace, setReplace] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  function reset() {
    setFileName(null);
    setSheetNames([]);
    setSheetName("");
    setRows([]);
    setHeaders([]);
    setMapping({});
    setWorkbook(null);
    setReplace(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      setWorkbook(wb);
      setFileName(file.name);
      setSheetNames(wb.SheetNames);
      setSheetName(wb.SheetNames[0]);
      loadSheet(wb, wb.SheetNames[0]);
    } catch (e) {
      toast.error("Não foi possível ler o arquivo.");
      console.error(e);
    }
  }

  function loadSheet(wb: XLSX.WorkBook, name: string) {
    const ws = wb.Sheets[name];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (json.length === 0) {
      setHeaders([]);
      setRows([]);
      setMapping({});
      return;
    }
    const hdrs = Object.keys(json[0]);
    setHeaders(hdrs);
    setRows(json);
    setMapping(autoMap(hdrs));
  }

  const parsed: ParsedRow[] = useMemo(() => {
    if (!mapping.date || !mapping.amount || !mapping.category) return [];
    return rows.map((raw) => {
      const date = parseDate(raw[mapping.date!]);
      const amountRaw = parseAmount(raw[mapping.amount!]);
      const amount = amountRaw == null ? null : Math.abs(amountRaw);
      const category = String(raw[mapping.category!] ?? "").trim();
      const subcategory = mapping.subcategory ? String(raw[mapping.subcategory] ?? "").trim() : "";
      const description = mapping.description ? String(raw[mapping.description] ?? "").trim() : "";
      const type = mapping.type ? parseType(raw[mapping.type], amountRaw ?? 0) : (amountRaw ?? 0) < 0 ? "expense" : "expense";
      const status = mapping.status ? parseStatus(raw[mapping.status]) : "paid";

      if (!date) return { raw, row: null, error: "Data inválida" };
      if (amount == null) return { raw, row: null, error: "Valor inválido" };
      if (!category) return { raw, row: null, error: "Categoria vazia" };

      return {
        raw,
        row: {
          type,
          amount,
          date,
          description,
          categoryName: category,
          subcategoryName: subcategory || undefined,
          status,
        },
      };
    });
  }, [rows, mapping]);

  const validCount = parsed.filter((p) => p.row).length;
  const invalidCount = parsed.length - validCount;

  function doImport() {
    const rowsToImport = parsed.map((p) => p.row).filter((r): r is ImportRow => !!r);
    if (rowsToImport.length === 0) {
      toast.error("Nenhuma linha válida para importar.");
      return;
    }
    const res = importRows(rowsToImport, { replace });
    toast.success(
      `${res.added} transações importadas${
        res.categoriesCreated ? `, ${res.categoriesCreated} categorias criadas` : ""
      }${res.subcategoriesCreated ? `, ${res.subcategoriesCreated} subcategorias criadas` : ""}.`,
    );
    reset();
    onOpenChange(false);
  }

  function downloadTemplate() {
    const data = [
      {
        Data: "2026-07-05",
        Descrição: "Salário mensal",
        Valor: 8500,
        Tipo: "Receita",
        Categoria: "Salário",
        Subcategoria: "CLT",
        Status: "Pago",
      },
      {
        Data: "2026-07-10",
        Descrição: "Aluguel",
        Valor: 2400,
        Tipo: "Despesa",
        Categoria: "Moradia",
        Subcategoria: "Aluguel",
        Status: "Pago",
      },
      {
        Data: "2026-07-15",
        Descrição: "Supermercado",
        Valor: 780,
        Tipo: "Despesa",
        Categoria: "Alimentação",
        Subcategoria: "Supermercado",
        Status: "Pendente",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transações");
    XLSX.writeFile(wb, "modelo-transacoes.xlsx");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar transações via Excel</DialogTitle>
        </DialogHeader>

        {!fileName ? (
          <div className="space-y-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors hover:bg-accent"
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <p className="font-medium">Clique para selecionar seu arquivo Excel</p>
              <p className="text-xs text-muted-foreground">.xlsx, .xls ou .csv</p>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />

            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Formato esperado</p>
              <p className="mt-1 text-muted-foreground">
                Colunas: <b>Data, Descrição, Valor, Tipo, Categoria, Subcategoria, Status</b>. Os
                nomes das colunas são detectados automaticamente e você pode ajustar o mapeamento
                depois. Categorias e subcategorias novas serão criadas automaticamente.
              </p>
              <Button
                variant="link"
                className="mt-2 h-auto p-0"
                onClick={downloadTemplate}
              >
                <Download className="mr-1 h-4 w-4" />
                Baixar planilha modelo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                {sheetNames.length > 1 && (
                  <Select
                    value={sheetName}
                    onValueChange={(v) => {
                      setSheetName(v);
                      if (workbook) loadSheet(workbook, v);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheetNames.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="ghost" size="sm" onClick={reset}>
                  Trocar arquivo
                </Button>
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-sm font-medium">Mapeamento de colunas</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => {
                  const required = key === "date" || key === "amount" || key === "category";
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 text-sm">
                        {COLUMN_LABELS[key]}
                        {required && <span className="text-expense"> *</span>}
                      </span>
                      <Select
                        value={mapping[key] ?? "__none__"}
                        onValueChange={(v) =>
                          setMapping((m) => ({ ...m, [key]: v === "__none__" ? undefined : v }))
                        }
                      >
                        <SelectTrigger className="h-9 flex-1">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— não usar —</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            {parsed.length > 0 && (
              <>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-income">
                    <CheckCircle2 className="h-4 w-4" /> {validCount} válidas
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-expense">
                      <AlertCircle className="h-4 w-4" /> {invalidCount} com erro
                    </span>
                  )}
                </div>

                <div className="max-h-[320px] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.slice(0, 100).map((p, i) => (
                        <TableRow
                          key={i}
                          className={cn(!p.row && "bg-expense/5")}
                        >
                          <TableCell>
                            {p.row ? (
                              <CheckCircle2 className="h-4 w-4 text-income" />
                            ) : (
                              <span title={p.error}>
                                <AlertCircle className="h-4 w-4 text-expense" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {p.row?.date ?? String(p.raw[mapping.date ?? ""] ?? "")}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">
                            {p.row?.description ??
                              String(p.raw[mapping.description ?? ""] ?? "")}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.row?.categoryName}
                            {p.row?.subcategoryName && (
                              <span className="text-muted-foreground"> / {p.row.subcategoryName}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.row?.type === "income"
                              ? "Receita"
                              : p.row?.type === "expense"
                                ? "Despesa"
                                : "—"}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "whitespace-nowrap text-right text-xs tabular-nums",
                              p.row?.type === "income" ? "text-income" : "text-expense",
                            )}
                          >
                            {p.row ? formatBRL(p.row.amount) : p.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsed.length > 100 && (
                    <p className="p-2 text-center text-xs text-muted-foreground">
                      Exibindo 100 de {parsed.length} linhas.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">Substituir todas as transações</Label>
                    <p className="text-xs text-muted-foreground">
                      {replace
                        ? "As transações atuais serão apagadas."
                        : "Novas transações serão adicionadas às existentes."}
                    </p>
                  </div>
                  <Switch checked={replace} onCheckedChange={setReplace} />
                </div>
              </>
            )}

            {parsed.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Selecione ao menos as colunas de <b>Data</b>, <b>Valor</b> e <b>Categoria</b> para
                visualizar o preview.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={doImport} disabled={validCount === 0}>
            Importar {validCount > 0 ? `(${validCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

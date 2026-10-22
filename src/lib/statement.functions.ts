import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface StatementEntry {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // sempre positivo
  type: "income" | "expense";
}

const InputSchema = z.object({
  kind: z.enum(["csv", "pdf"]),
  fileName: z.string().max(200).default("extrato"),
  /** CSV: texto puro. PDF: base64 do arquivo. */
  content: z.string().min(16).max(14_000_000),
});

const MAX_ENTRIES = 300;

const PDF_PROMPT = `Você é um leitor de extratos bancários brasileiros.
Extraia TODAS as movimentações do extrato em PDF anexado e responda APENAS com um JSON válido, sem texto extra, no formato:
{"entries":[{"date":"YYYY-MM-DD","description":"string","amount":number}]}
Regras:
- amount com SINAL: negativo para saídas/débitos/pagamentos, positivo para entradas/créditos/recebimentos. Ponto como separador decimal, sem símbolo de moeda.
- date no formato ISO YYYY-MM-DD (converta dd/mm/aaaa quando necessário).
- description é o histórico/descrição da movimentação, resumido em até 60 caracteres.
- Ignore saldo anterior, saldo do dia, saldo disponível e linhas de totais — apenas movimentações.
- Se não for um extrato ou estiver ilegível, retorne {"entries":[]}.`;

const CSV_PROMPT = `Você é um leitor de extratos bancários brasileiros.
O texto a seguir é o conteúdo de um arquivo CSV de extrato. Extraia TODAS as movimentações e responda APENAS com um JSON válido, sem texto extra, no formato:
{"entries":[{"date":"YYYY-MM-DD","description":"string","amount":number}]}
Regras:
- amount com SINAL: negativo para saídas/débitos, positivo para entradas/créditos. Ponto como separador decimal.
- date no formato ISO YYYY-MM-DD.
- description resumida em até 60 caracteres.
- Ignore saldos e totais — apenas movimentações.
- Se não conseguir identificar movimentações, retorne {"entries":[]}.

CONTEÚDO DO CSV:
%CSV%`;

function parseJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}\b)/g, "")
      .replace(",", ".");
    const n = Number(normalized);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toISODate(value: string): string | null {
  const v = value.trim();
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  }
  return null;
}

function normalizeHeader(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
}

/** Tenta ler o CSV localmente procurando colunas de data, descrição e valor. */
function parseCsvLocally(text: string): StatementEntry[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const first = lines[0]!;
  const delimiter = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ";" : ",";

  // acha a linha de cabeçalho
  let headerIndex = -1;
  let columns: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = splitCsvLine(lines[i]!, delimiter).map(normalizeHeader);
    if (cols.some((c) => c === "data" || c === "date" || c.startsWith("data "))) {
      headerIndex = i;
      columns = cols;
      break;
    }
  }
  if (headerIndex < 0) return [];

  const dateCol = columns.findIndex((c) => c === "data" || c === "date" || c.startsWith("data"));
  const descCol = columns.findIndex(
    (c) =>
      c.includes("descri") || c.includes("historico") || c.includes("memo") || c.includes("estabelec"),
  );
  const amountCol = columns.findIndex(
    (c) => c === "valor" || c === "amount" || c.includes("valor") || c.includes("montante"),
  );
  const debitCol = columns.findIndex((c) => c.includes("debito"));
  const creditCol = columns.findIndex((c) => c.includes("credito"));

  if (dateCol < 0 || (amountCol < 0 && debitCol < 0 && creditCol < 0)) return [];

  const entries: StatementEntry[] = [];
  for (let i = headerIndex + 1; i < lines.length && entries.length < MAX_ENTRIES; i++) {
    const cols = splitCsvLine(lines[i]!, delimiter);
    const date = toISODate(cols[dateCol] ?? "");
    if (!date) continue;

    let signed: number | null = null;
    if (amountCol >= 0) {
      signed = toNumber(cols[amountCol] ?? "");
    } else {
      const debit = toNumber(cols[debitCol] ?? "") ?? 0;
      const credit = toNumber(cols[creditCol] ?? "") ?? 0;
      if (debit !== 0 || credit !== 0) signed = credit - Math.abs(debit);
    }
    if (signed === null || signed === 0) continue;

    const description = (descCol >= 0 ? cols[descCol] : "")?.slice(0, 80) || "Movimentação";
    entries.push({
      date,
      description,
      amount: Math.round(Math.abs(signed) * 100) / 100,
      type: signed < 0 ? "expense" : "income",
    });
  }
  return entries;
}

function sanitizeEntries(raw: unknown): StatementEntry[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as { entries?: unknown }).entries;
  if (!Array.isArray(list)) return [];
  const out: StatementEntry[] = [];
  for (const item of list.slice(0, MAX_ENTRIES)) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const date = typeof rec["date"] === "string" ? toISODate(rec["date"]) : null;
    const amount = toNumber(rec["amount"]);
    if (!date || amount === null || amount === 0) continue;
    const description =
      typeof rec["description"] === "string" && rec["description"].trim()
        ? rec["description"].trim().slice(0, 80)
        : "Movimentação";
    out.push({
      date,
      description,
      amount: Math.round(Math.abs(amount) * 100) / 100,
      type: amount < 0 ? "expense" : "income",
    });
  }
  return out;
}

async function callGateway(body: Record<string, unknown>): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("A leitura automática não está configurada neste app.");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 402) {
      throw new Error(
        "Os créditos de inteligência artificial acabaram. Adicione créditos para continuar lendo extratos.",
      );
    }
    if (response.status === 429) {
      throw new Error("Muitas leituras em pouco tempo. Aguarde alguns segundos e tente de novo.");
    }
    if (response.status >= 500) {
      throw new Error("O serviço de leitura está instável agora. Tente novamente em instantes.");
    }
    console.error("[statement] gateway error", response.status, text.slice(0, 500));
    throw new Error("Não foi possível ler o extrato agora.");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return payload.choices?.[0]?.message?.content ?? "";
}

export const parseStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<{ entries: StatementEntry[]; warnings: string[] }> => {
    const warnings: string[] = [];

    if (data.kind === "csv") {
      const local = parseCsvLocally(data.content);
      if (local.length > 0) return { entries: local, warnings };

      // layout desconhecido: deixa a IA interpretar o texto
      const truncated = data.content.slice(0, 20_000);
      if (data.content.length > 20_000) {
        warnings.push("O arquivo era muito grande; apenas o começo foi lido.");
      }
      const content = await callGateway({
        model: "google/gemini-3.8-flash",
        messages: [{ role: "user", content: CSV_PROMPT.replace("%CSV%", truncated) }],
      });
      const entries = sanitizeEntries(parseJson(content));
      if (entries.length === 0) {
        warnings.push(
          "Não consegui identificar as movimentações deste CSV. Confira se ele tem colunas de data, descrição e valor.",
        );
      }
      return { entries, warnings };
    }

    // PDF
    const content = await callGateway({
      model: "google/gemini-3.8-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PDF_PROMPT },
            {
              type: "file",
              file: {
                filename: data.fileName || "extrato.pdf",
                file_data: `data:application/pdf;base64,${data.content}`,
              },
            },
          ],
        },
      ],
    });
    const entries = sanitizeEntries(parseJson(content));
    if (entries.length === 0) {
      warnings.push(
        "Não consegui identificar movimentações neste PDF. Se ele for digitalizado (foto), tente um PDF com texto ou um CSV.",
      );
    }
    return { entries, warnings };
  });

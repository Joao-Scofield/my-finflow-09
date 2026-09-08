import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ReceiptExtraction {
  date: string | null;
  amount: number | null;
  merchant: string | null;
  description: string | null;
  paymentMethod: string | null;
  categoryHint: string | null;
}

const InputSchema = z.object({
  /** data URL: data:image/jpeg;base64,... */
  image: z
    .string()
    .min(32)
    .max(12_000_000)
    .refine((v) => /^data:image\/(jpeg|jpg|png|webp);base64,/.test(v), "Formato de imagem inválido"),
  categories: z.array(z.string().max(60)).max(60).default([]),
});

const PROMPT = `Você é um leitor de comprovantes de pagamento brasileiros (cupons fiscais, recibos, comprovantes PIX, faturas).
Extraia os dados do comprovante da imagem e responda APENAS com um JSON válido, sem texto extra, no formato:
{"date":"YYYY-MM-DD|null","amount":number|null,"merchant":"string|null","description":"string|null","paymentMethod":"pix|credito|debito|dinheiro|vr|va|boleto|transferencia|outro|null","categoryHint":"string|null"}
Regras:
- amount é o VALOR TOTAL pago, em número (ponto como separador decimal), sem símbolo de moeda.
- date no formato ISO YYYY-MM-DD. Se não houver data legível, use null.
- merchant é o nome do estabelecimento.
- description é um resumo curto do que foi pago (máx. 60 caracteres).
- categoryHint deve ser escolhido, quando possível, entre estas categorias existentes: %CATS%.
- Se a imagem não for um comprovante ou estiver ilegível, retorne todos os campos como null.`;

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

function toText(value: unknown, max = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  return trimmed.slice(0, max);
}

export const readReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<ReceiptExtraction> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A leitura automática não está configurada neste app.");

    const prompt = PROMPT.replace(
      "%CATS%",
      data.categories.length ? data.categories.join(", ") : "(nenhuma cadastrada)",
    );

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: data.image } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 402) {
        throw new Error(
          "Os créditos de inteligência artificial acabaram. Adicione créditos para continuar lendo comprovantes.",
        );
      }
      if (response.status === 429) {
        throw new Error("Muitas leituras em pouco tempo. Aguarde alguns segundos e tente de novo.");
      }
      if (response.status >= 500) {
        throw new Error("O serviço de leitura está instável agora. Tente novamente em instantes.");
      }
      console.error("[receipt] gateway error", response.status, body.slice(0, 500));
      throw new Error("Não foi possível ler o comprovante agora.");
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseJson(content) as Record<string, unknown> | null;

    if (!parsed) {
      return {
        date: null,
        amount: null,
        merchant: null,
        description: null,
        paymentMethod: null,
        categoryHint: null,
      };
    }

    const rawDate = toText(parsed["date"], 10);
    const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
    const amount = toNumber(parsed["amount"]);

    return {
      date,
      amount: amount !== null && amount > 0 ? Math.round(amount * 100) / 100 : null,
      merchant: toText(parsed["merchant"], 80),
      description: toText(parsed["description"], 80),
      paymentMethod: toText(parsed["paymentMethod"], 20)?.toLowerCase() ?? null,
      categoryHint: toText(parsed["categoryHint"], 60),
    };
  });

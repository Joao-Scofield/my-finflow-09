import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const paymentMethodValues = [
  "pix",
  "credito",
  "debito",
  "dinheiro",
  "vr",
  "va",
  "boleto",
  "transferencia",
  "investimento",
  "outro",
] as const;

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().max(1_000_000_000),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date deve estar no formato yyyy-mm-dd")
    .optional(),
  description: z.string().max(500).optional(),
  category: z.string().min(1).max(120).optional(),
  categoryId: z.string().uuid().optional(),
  subcategory: z.string().min(1).max(120).optional(),
  paymentMethod: z.enum(paymentMethodValues).optional(),
  account: z.string().min(1).max(120).optional(),
  accountId: z.string().uuid().optional(),
  status: z.enum(["paid", "pending"]).optional(),
});

const payloadSchema = z.union([transactionSchema, z.array(transactionSchema).min(1).max(200)]);

const querySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

async function authenticate(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return { error: json({ error: "Token ausente." }, 401) } as const;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("finance_api_tokens")
    .select("id,user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) return { error: json({ error: "Falha ao validar o token." }, 500) } as const;
  if (!data) return { error: json({ error: "Token inválido." }, 401) } as const;

  await supabaseAdmin
    .from("finance_api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { userId: data.user_id as string, supabaseAdmin } as const;
}

async function resolveCategory(
  supabaseAdmin: AdminClient,
  userId: string,
  input: z.infer<typeof transactionSchema>,
) {
  if (input.categoryId) {
    const { data } = await supabaseAdmin
      .from("finance_categories")
      .select("id,type")
      .eq("id", input.categoryId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data || data.type !== input.type) return null;
    return data.id as string;
  }

  const { data: categories } = await supabaseAdmin
    .from("finance_categories")
    .select("id,name,type")
    .eq("user_id", userId)
    .eq("type", input.type);

  const wanted = input.category?.trim();
  if (wanted) {
    const found = (categories ?? []).find((c) => normalize(c.name) === normalize(wanted));
    if (found) return found.id as string;
  }

  const fallbackName =
    wanted || (input.type === "income" ? "Outras Receitas" : "Outras Despesas");
  const existing = (categories ?? []).find((c) => normalize(c.name) === normalize(fallbackName));
  if (existing) return existing.id as string;

  const { data: created, error } = await supabaseAdmin
    .from("finance_categories")
    .insert({
      user_id: userId,
      name: fallbackName,
      color: "#6366f1",
      icon: "Tag",
      type: input.type,
      position: categories?.length ?? 0,
    })
    .select("id")
    .single();
  if (error) return null;
  return created.id as string;
}

async function resolveSubcategory(
  supabaseAdmin: AdminClient,
  userId: string,
  categoryId: string,
  name?: string,
) {
  if (!name?.trim()) return null;
  const { data: subs } = await supabaseAdmin
    .from("finance_subcategories")
    .select("id,name")
    .eq("user_id", userId)
    .eq("category_id", categoryId);
  const found = (subs ?? []).find((s) => normalize(s.name) === normalize(name));
  if (found) return found.id as string;

  const { data: created } = await supabaseAdmin
    .from("finance_subcategories")
    .insert({
      user_id: userId,
      category_id: categoryId,
      name: name.trim(),
      position: subs?.length ?? 0,
    })
    .select("id")
    .single();
  return created?.id ?? null;
}

async function resolveAccount(
  supabaseAdmin: AdminClient,
  userId: string,
  input: z.infer<typeof transactionSchema>,
) {
  const { data: accounts } = await supabaseAdmin
    .from("finance_accounts")
    .select("id,name")
    .eq("user_id", userId)
    .order("position");
  if (!accounts || accounts.length === 0) return null;
  if (input.accountId) {
    return accounts.find((a) => a.id === input.accountId)?.id ?? null;
  }
  if (input.account) {
    return accounts.find((a) => normalize(a.name) === normalize(input.account!))?.id ?? null;
  }
  return null;
}

async function applyRules(
  supabaseAdmin: AdminClient,
  userId: string,
  description: string,
  type: "income" | "expense",
) {
  if (!description.trim()) return null;
  const { data: rules } = await supabaseAdmin
    .from("finance_rules")
    .select("category_id,subcategory_id,keywords,enabled,priority")
    .eq("user_id", userId)
    .eq("enabled", true)
    .order("priority", { ascending: false });
  if (!rules?.length) return null;

  const desc = normalize(description);
  for (const rule of rules) {
    if (!(rule.keywords ?? []).some((kw: string) => kw.trim() && desc.includes(normalize(kw)))) {
      continue;
    }
    const { data: cat } = await supabaseAdmin
      .from("finance_categories")
      .select("id,type")
      .eq("id", rule.category_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (cat && cat.type === type) {
      return { categoryId: cat.id as string, subcategoryId: rule.subcategory_id as string | null };
    }
  }
  return null;
}

export const Route = createFileRoute("/api/public/transactions")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if ("error" in auth) return auth.error;

        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return json({ error: "Parâmetros inválidos.", details: parsed.error.issues }, 400);
        }

        let query = auth.supabaseAdmin
          .from("finance_transactions")
          .select(
            "id,type,amount,transaction_date,description,status,payment_method,category_id,subcategory_id,account_id",
          )
          .eq("user_id", auth.userId)
          .order("transaction_date", { ascending: false })
          .limit(parsed.data.limit);

        if (parsed.data.from) query = query.gte("transaction_date", parsed.data.from);
        if (parsed.data.to) query = query.lte("transaction_date", parsed.data.to);

        const { data, error } = await query;
        if (error) return json({ error: "Falha ao consultar lançamentos." }, 500);
        return json({ count: data?.length ?? 0, transactions: data ?? [] });
      },

      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if ("error" in auth) return auth.error;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Corpo da requisição inválido (JSON esperado)." }, 400);
        }

        const parsed = payloadSchema.safeParse(body);
        if (!parsed.success) {
          return json({ error: "Dados inválidos.", details: parsed.error.issues }, 400);
        }

        const items = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
        const rows: Record<string, unknown>[] = [];

        for (const item of items) {
          const description = item.description?.trim() ?? "";
          let categoryId: string | null = null;
          let subcategoryId: string | null = null;

          if (!item.category && !item.categoryId) {
            const match = await applyRules(auth.supabaseAdmin, auth.userId, description, item.type);
            if (match) {
              categoryId = match.categoryId;
              subcategoryId = match.subcategoryId;
            }
          }

          if (!categoryId) {
            categoryId = await resolveCategory(auth.supabaseAdmin, auth.userId, item);
            if (!categoryId) {
              return json({ error: "Categoria inválida para o tipo informado." }, 400);
            }
            subcategoryId = await resolveSubcategory(
              auth.supabaseAdmin,
              auth.userId,
              categoryId,
              item.subcategory,
            );
          }

          const accountId = await resolveAccount(auth.supabaseAdmin, auth.userId, item);
          if ((item.account || item.accountId) && !accountId) {
            return json({ error: "Saldo (conta) não encontrado." }, 400);
          }

          rows.push({
            user_id: auth.userId,
            type: item.type,
            amount: item.amount,
            transaction_date: item.date ?? new Date().toISOString().slice(0, 10),
            description,
            status: item.status ?? "paid",
            payment_method: item.paymentMethod ?? "outro",
            category_id: categoryId,
            subcategory_id: subcategoryId,
            account_id: accountId,
          });
        }

        const { data, error } = await auth.supabaseAdmin
          .from("finance_transactions")
          .insert(rows)
          .select("id");
        if (error) return json({ error: "Falha ao salvar lançamentos." }, 500);

        return json({ created: data?.length ?? 0, ids: (data ?? []).map((r) => r.id) }, 201);
      },
    },
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_transactions",
  title: "List transactions",
  description:
    "List the signed-in user's transactions, optionally filtered by date range and type. Returns the most recent first.",
  inputSchema: {
    from: z.string().optional().describe("Start date (inclusive), format YYYY-MM-DD."),
    to: z.string().optional().describe("End date (inclusive), format YYYY-MM-DD."),
    type: z.enum(["income", "expense"]).optional().describe("Filter by income or expense."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50, max 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, type, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("finance_transactions")
      .select(
        "id,type,amount,transaction_date,description,status,payment_method,category_id,subcategory_id,account_id",
      )
      .order("transaction_date", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));

    if (from) query = query.gte("transaction_date", from);
    if (to) query = query.lte("transaction_date", to);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const transactions = (data ?? []).map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      date: t.transaction_date,
      description: t.description,
      status: t.status,
      paymentMethod: t.payment_method,
      categoryId: t.category_id,
      subcategoryId: t.subcategory_id,
      accountId: t.account_id,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(transactions) }],
      structuredContent: { transactions },
    };
  },
});

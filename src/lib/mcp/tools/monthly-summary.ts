import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "monthly_summary",
  title: "Monthly summary",
  description:
    "Summarize the signed-in user's income, expenses, balance and totals per category for one month.",
  inputSchema: {
    month: z.string().describe("Month to summarize, format YYYY-MM (e.g. 2026-08)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ month }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    if (!/^\d{4}-\d{2}$/.test(month))
      return { content: [{ type: "text", text: "month must use the YYYY-MM format" }], isError: true };

    const [yearText, monthText] = month.split("-");
    const year = Number(yearText);
    const monthIndex = Number(monthText);
    const start = `${month}-01`;
    const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
    const end = `${month}-${String(lastDay).padStart(2, "0")}`;

    const supabase = supabaseForUser(ctx);
    const [tx, cats] = await Promise.all([
      supabase
        .from("finance_transactions")
        .select("type,amount,category_id")
        .gte("transaction_date", start)
        .lte("transaction_date", end),
      supabase.from("finance_categories").select("id,name"),
    ]);
    if (tx.error) return { content: [{ type: "text", text: tx.error.message }], isError: true };
    if (cats.error) return { content: [{ type: "text", text: cats.error.message }], isError: true };

    const names = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
    let income = 0;
    let expense = 0;
    const byCategory = new Map<string, number>();

    for (const row of tx.data ?? []) {
      const amount = Number(row.amount);
      if (row.type === "income") income += amount;
      else {
        expense += amount;
        const key = names.get(row.category_id) ?? "Sem categoria";
        byCategory.set(key, (byCategory.get(key) ?? 0) + amount);
      }
    }

    const summary = {
      month,
      income,
      expense,
      balance: income - expense,
      expensesByCategory: [...byCategory.entries()]
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});

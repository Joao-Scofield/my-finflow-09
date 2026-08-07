import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const PAYMENT_METHODS = [
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

export default defineTool({
  name: "create_transaction",
  title: "Create transaction",
  description:
    "Create an income or expense for the signed-in user. Use list_categories and list_accounts first to get valid ids.",
  inputSchema: {
    type: z.enum(["income", "expense"]).describe("Income or expense."),
    amount: z.number().describe("Positive amount in BRL."),
    date: z.string().describe("Transaction date, format YYYY-MM-DD."),
    description: z.string().describe("Short description of the transaction."),
    categoryId: z.string().describe("Category id from list_categories."),
    subcategoryId: z.string().optional().describe("Optional subcategory id."),
    accountId: z.string().optional().describe("Optional account (saldo) id from list_accounts."),
    paymentMethod: z
      .enum(PAYMENT_METHODS)
      .optional()
      .describe("Payment method; defaults to 'outro'."),
    status: z.enum(["paid", "pending"]).optional().describe("Defaults to 'paid'."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    if (!(input.amount > 0))
      return { content: [{ type: "text", text: "amount must be greater than zero" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("finance_transactions")
      .insert({
        user_id: ctx.getUserId(),
        type: input.type,
        amount: input.amount,
        transaction_date: input.date,
        description: input.description,
        category_id: input.categoryId,
        subcategory_id: input.subcategoryId ?? null,
        account_id: input.accountId ?? null,
        payment_method: input.paymentMethod ?? "outro",
        status: input.status ?? "paid",
      })
      .select("id,type,amount,transaction_date,description")
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { transaction: data },
    };
  },
});

import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_accounts",
  title: "List accounts (saldos)",
  description:
    "List the signed-in user's accounts/balances (saldos) with their ids, kind and current balance.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("finance_accounts")
      .select("id,name,kind,balance,color")
      .order("position");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const accounts = (data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      initialBalance: Number(a.balance),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(accounts) }],
      structuredContent: { accounts },
    };
  },
});

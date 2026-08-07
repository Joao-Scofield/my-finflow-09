import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description:
    "List the signed-in user's income and expense categories with their subcategories and ids.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const supabase = supabaseForUser(ctx);
    const [cats, subs] = await Promise.all([
      supabase.from("finance_categories").select("id,name,type,color").order("position"),
      supabase.from("finance_subcategories").select("id,name,category_id").order("position"),
    ]);
    if (cats.error) return { content: [{ type: "text", text: cats.error.message }], isError: true };
    if (subs.error) return { content: [{ type: "text", text: subs.error.message }], isError: true };

    const categories = (cats.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      subcategories: (subs.data ?? [])
        .filter((s) => s.category_id === c.id)
        .map((s) => ({ id: s.id, name: s.name })),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(categories) }],
      structuredContent: { categories },
    };
  },
});

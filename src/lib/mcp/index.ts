import { auth, defineMcp } from "@lovable.dev/mcp-js";

import createTransactionTool from "./tools/create-transaction";
import listAccountsTool from "./tools/list-accounts";
import listCategoriesTool from "./tools/list-categories";
import listTransactionsTool from "./tools/list-transactions";
import monthlySummaryTool from "./tools/monthly-summary";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "my-money-garden",
  title: "My Money Garden",
  version: "0.1.0",
  instructions:
    "Tools for the My Money Garden personal finance app (Portuguese/BRL). Use list_categories and list_accounts to resolve ids before creating a transaction with create_transaction. Use list_transactions for raw entries and monthly_summary for month totals.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listCategoriesTool,
    listAccountsTool,
    listTransactionsTool,
    createTransactionTool,
    monthlySummaryTool,
  ],
});

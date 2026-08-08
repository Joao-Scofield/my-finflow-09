export type ShoppingPriority = "alta" | "media" | "baixa";

export const shoppingPriorities: { value: ShoppingPriority; label: string; color: string }[] = [
  { value: "alta", label: "Alta", color: "#ef4444" },
  { value: "media", label: "Média", color: "#f59e0b" },
  { value: "baixa", label: "Baixa", color: "#10b981" },
];

export const priorityLabel = (v: string) =>
  shoppingPriorities.find((p) => p.value === v)?.label ?? "Média";
export const priorityColor = (v: string) =>
  shoppingPriorities.find((p) => p.value === v)?.color ?? "#f59e0b";
export const priorityRank = (v: string) => (v === "alta" ? 0 : v === "media" ? 1 : 2);

export type ShoppingStatus = "desejado" | "comprado";

export interface ShoppingItem {
  id: string;
  name: string;
  estimatedAmount: number;
  url: string;
  store: string;
  quantity: number;
  priority: ShoppingPriority;
  categoryId?: string;
  notes: string;
  status: ShoppingStatus;
  purchasedAt?: string;
  transactionId?: string;
}

export const itemTotal = (i: ShoppingItem) => i.estimatedAmount * Math.max(1, i.quantity);

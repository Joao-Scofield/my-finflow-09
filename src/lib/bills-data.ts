import type { PaymentMethod } from "@/lib/finance-data";

export type BillStatus = "pending" | "paid";

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // yyyy-mm-dd
  recurring: boolean;
  notifyDaysBefore: number;
  categoryId?: string;
  accountId?: string;
  paymentMethod: PaymentMethod;
  notes: string;
  status: BillStatus;
  paidAt?: string;
}

export const notifyOptions = [0, 1, 2, 3, 5, 7, 10, 15, 30];

export const todayISO = () => new Date().toISOString().slice(0, 10);

/** dias até o vencimento (negativo = vencida) */
export function daysUntil(dueDate: string) {
  const [y, m, d] = dueDate.split("-").map(Number);
  const due = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const [ty, tm, td] = todayISO().split("-").map(Number);
  const now = Date.UTC(ty ?? 1970, (tm ?? 1) - 1, td ?? 1);
  return Math.round((due - now) / 86_400_000);
}

export function dueLabel(dueDate: string) {
  const diff = daysUntil(dueDate);
  if (diff < 0) return `Vencida há ${Math.abs(diff)} dia(s)`;
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Vence amanhã";
  return `Vence em ${diff} dias`;
}

export function dueTone(dueDate: string, status: BillStatus) {
  if (status === "paid") return "paid" as const;
  const diff = daysUntil(dueDate);
  if (diff < 0) return "overdue" as const;
  if (diff <= 3) return "soon" as const;
  return "future" as const;
}

export const formatDateBR = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** mesma data no mês seguinte, limitando ao último dia do mês */
export function nextMonthDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const year = y ?? 1970;
  const month = (m ?? 1) - 1;
  const day = d ?? 1;
  const target = new Date(Date.UTC(year, month + 1, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

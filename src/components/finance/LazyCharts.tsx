import { Suspense, lazy, type ComponentType } from "react";
import { ChartSkeleton } from "@/components/finance/Skeletons";
import type { Transaction } from "@/lib/finance-data";

function withSuspense<P extends object>(Comp: ComponentType<P>, height?: number) {
  return function Lazy(props: P) {
    return (
      <Suspense fallback={<ChartSkeleton height={height} />}>
        <Comp {...props} />
      </Suspense>
    );
  };
}

const ExpenseBreakdown = lazy(() =>
  import("./Charts").then((m) => ({ default: m.ExpenseBreakdownChart })),
);
const IncomeBreakdown = lazy(() =>
  import("./Charts").then((m) => ({ default: m.IncomeBreakdownChart })),
);
const PaymentMethod = lazy(() =>
  import("./Charts").then((m) => ({ default: m.PaymentMethodChart })),
);
const MonthlyComparison = lazy(() =>
  import("./Charts").then((m) => ({ default: m.MonthlyComparisonChart })),
);
const BalanceHistory = lazy(() =>
  import("./BalanceHistoryChart").then((m) => ({ default: m.BalanceHistoryChart })),
);

export const LazyExpenseBreakdownChart = withSuspense<{ monthTransactions: Transaction[] }>(
  ExpenseBreakdown,
);
export const LazyIncomeBreakdownChart = withSuspense<{ monthTransactions: Transaction[] }>(
  IncomeBreakdown,
);
export const LazyPaymentMethodChart = withSuspense<{ monthTransactions: Transaction[] }>(
  PaymentMethod,
  220,
);
export const LazyMonthlyComparisonChart = withSuspense<{
  month: number;
  year: number;
  monthTransactions?: Transaction[];
}>(
  MonthlyComparison as ComponentType<{
    month: number;
    year: number;
    monthTransactions?: Transaction[];
  }>,
  260,
);
export const LazyBalanceHistoryChart = withSuspense<Record<string, never>>(
  BalanceHistory as ComponentType<Record<string, never>>,
  300,
);

import { Suspense, lazy, type ComponentType } from "react";
import { ChartSkeleton } from "@/components/finance/Skeletons";
import type { Vehicle } from "@/lib/fleet-data";

function withSuspense<P extends object>(Comp: ComponentType<P>, height?: number) {
  return function Lazy(props: P) {
    return (
      <Suspense fallback={<ChartSkeleton height={height} />}>
        <Comp {...props} />
      </Suspense>
    );
  };
}

const CostPerKm = lazy(() => import("./FleetCharts").then((m) => ({ default: m.CostPerKmChart })));
const CostComposition = lazy(() =>
  import("./FleetCharts").then((m) => ({ default: m.CostCompositionChart })),
);
const VehicleComparison = lazy(() =>
  import("./FleetCharts").then((m) => ({ default: m.VehicleComparisonChart })),
);

type VehicleChartProps = { month: number; year: number; vehicle: Vehicle | null };

export const LazyCostPerKmChart = withSuspense(
  CostPerKm as unknown as ComponentType<VehicleChartProps>,
);
export const LazyCostCompositionChart = withSuspense(
  CostComposition as unknown as ComponentType<VehicleChartProps>,
);
export const LazyVehicleComparisonChart = withSuspense(
  VehicleComparison as ComponentType<{ month: number; year: number }>,
  260,
);

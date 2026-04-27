import { queryOptions, QueryClient } from "@tanstack/react-query";
import { loadVehicles, loadVehicleSpending, type VehicleRow, type VehicleSpendSummary } from "@/actions/vehicles";
import { queryKeys } from "./keys";

export const VEHICLE_CHART_COLORS = [
  "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6",
  "#ef4444", "#06b6d4", "#f97316", "#84cc16",
];

export function buildVehicleColorMap(vehicles: VehicleRow[]): Record<string, string> {
  return Object.fromEntries(
    vehicles.map((v, i) => [v.id, VEHICLE_CHART_COLORS[i % VEHICLE_CHART_COLORS.length]])
  );
}

export const vehiclesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.vehicles(),
    queryFn: async (): Promise<VehicleRow[]> => {
      const res = await loadVehicles();
      if (res.error) throw new Error(res.error);
      return res.vehicles;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const vehicleSpendingQueryOptions = () =>
  queryOptions({
    queryKey: [...queryKeys.vehicles(), "spending"] as const,
    queryFn: async (): Promise<VehicleSpendSummary[]> => {
      const res = await loadVehicleSpending();
      if (res.error) throw new Error(res.error);
      return res.summaries;
    },
  });

export function invalidateVehicleQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.vehicles() });
}

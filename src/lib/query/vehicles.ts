import { queryOptions, QueryClient } from "@tanstack/react-query";
import { loadVehicles, loadVehicleSpending, loadVehicleLinkedBills, type VehicleRow, type VehicleSpendEntry, type VehicleLinkedBill } from "@/actions/vehicles";
import { TRANSPORT_EXPENSE_CATEGORY_ID } from "@/lib/constants/expense-categories";
import { VEHICLE_TREND_MONTHS } from "@/lib/constants/vehicles";
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
    queryFn: () => Promise.resolve().then(async (): Promise<VehicleRow[]> => {
      const res = await loadVehicles();
      if (res.error) throw new Error(res.error);
      return res.vehicles;
    }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

/**
 * Vehicle spending (linked expenses and payments on linked bills) for the
 * `months` months ending at `endMonth` (YYYY-MM). One query feeds the month's
 * figures, the month before it for comparison, and the trend bars.
 */
export const vehicleSpendingQueryOptions = (endMonth: string, months: number = VEHICLE_TREND_MONTHS) =>
  queryOptions({
    queryKey: [...queryKeys.vehicles(), "spending", endMonth, months] as const,
    queryFn: () => Promise.resolve().then(async (): Promise<VehicleSpendEntry[]> => {
      const res = await loadVehicleSpending(endMonth, months);
      if (res.error) throw new Error(res.error);
      return res.entries;
    }),
  });

export const vehicleLinkedBillsQueryOptions = (vehicleId: string | null | undefined) =>
  queryOptions({
    queryKey: [...queryKeys.vehicles(), "linked-bills", vehicleId ?? ""] as const,
    queryFn: () => Promise.resolve().then(async (): Promise<VehicleLinkedBill[]> => {
      if (!vehicleId) return [];
      const res = await loadVehicleLinkedBills(vehicleId);
      if (res.error) throw new Error(res.error);
      return res.bills;
    }),
  });

export function invalidateVehicleQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.vehicles() });
}

/** When an expense used to be or is now Transport & Commute, refresh vehicle list + per-month spending queries. */
export function invalidateVehicleQueriesIfTransportAffected(
  queryClient: QueryClient,
  ...categoryIds: (string | null | undefined)[]
) {
  for (const id of categoryIds) {
    if (id === TRANSPORT_EXPENSE_CATEGORY_ID) {
      return invalidateVehicleQueries(queryClient);
    }
  }
}

import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { VehiclesBoard } from "@/components/dashboard/vehicles-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { vehicleSpendingQueryOptions, vehiclesQueryOptions } from "@/lib/query/vehicles";
import { getCurrentPaidMonth } from "@/lib/paid-month";

export default async function VehiclesPage() {
  // The board opens on this month and its data is prefetched for it, so the
  // server and the browser render the same month.
  const currentMonth = getCurrentPaidMonth();
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(vehiclesQueryOptions()),
    queryClient.prefetchQuery(vehicleSpendingQueryOptions(currentMonth)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DashboardSkeleton variant="page" />}>
        <VehiclesBoard currentMonth={currentMonth} />
      </Suspense>
    </HydrationBoundary>
  );
}

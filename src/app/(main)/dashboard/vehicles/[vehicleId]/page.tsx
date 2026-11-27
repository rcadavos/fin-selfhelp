import { Suspense } from "react";
import { notFound } from "next/navigation";
import { dehydrate } from "@tanstack/react-query";
import { VehicleDetailBoard } from "@/components/dashboard/vehicle-detail-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import {
  vehicleLinkedBillsQueryOptions,
  vehicleSpendingQueryOptions,
  vehiclesQueryOptions,
} from "@/lib/query/vehicles";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import type { VehicleRow } from "@/actions/vehicles";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const currentMonth = getCurrentPaidMonth();
  const queryClient = getQueryClient();
  const [vehicles] = await Promise.all([
    queryClient.fetchQuery(vehiclesQueryOptions()).catch((): VehicleRow[] => []),
    queryClient.prefetchQuery(vehicleSpendingQueryOptions(currentMonth)),
    queryClient.prefetchQuery(vehicleLinkedBillsQueryOptions(vehicleId)),
  ]);
  if (!vehicles.some((v) => v.id === vehicleId)) notFound();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DashboardSkeleton variant="page" />}>
        <VehicleDetailBoard vehicleId={vehicleId} currentMonth={currentMonth} />
      </Suspense>
    </HydrationBoundary>
  );
}

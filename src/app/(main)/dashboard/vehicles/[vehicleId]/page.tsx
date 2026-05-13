import { Suspense } from "react";
import { notFound } from "next/navigation";
import { loadVehicle } from "@/actions/vehicles";
import { VehicleDetailBoard } from "@/components/dashboard/vehicle-detail-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const { vehicle } = await loadVehicle(vehicleId);
  if (!vehicle) notFound();

  return (
    <Suspense fallback={<DashboardSkeleton variant="page" />}>
      <VehicleDetailBoard vehicle={vehicle} />
    </Suspense>
  );
}

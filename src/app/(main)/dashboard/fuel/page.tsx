import { Suspense } from "react";
import { VehiclesBoard } from "@/components/dashboard/vehicles-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function GasPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="page" />}>
      <VehiclesBoard />
    </Suspense>
  );
}

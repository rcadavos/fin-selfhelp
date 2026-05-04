import { Suspense } from "react";
import { ReceivablesBoard } from "@/components/dashboard/receivables-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function ReceivablesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="form" />}>
      <ReceivablesBoard />
    </Suspense>
  );
}

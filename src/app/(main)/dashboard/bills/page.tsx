import { Suspense } from "react";
import { BillsBoard } from "@/components/dashboard/bills-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function BillsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="page" />}>
      <BillsBoard />
    </Suspense>
  );
}

import { Suspense } from "react";
import { ExpenseCashflowPage } from "@/components/dashboard/expense-cashflow-page";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="dashboard" />}>
      <ExpenseCashflowPage pageVariant="dashboard" />
    </Suspense>
  );
}

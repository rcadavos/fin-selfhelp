import { Suspense } from "react";
import { MyExpensesBoard } from "@/components/dashboard/my-expenses-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function ExpensesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton variant="page" />}>
      <MyExpensesBoard />
    </Suspense>
  );
}

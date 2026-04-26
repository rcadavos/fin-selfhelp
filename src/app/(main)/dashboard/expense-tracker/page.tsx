import { Suspense } from "react";
import { ExpenseCashflowPage } from "@/components/dashboard/expense-cashflow-page";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { parseExpenseCadenceTypeParam } from "@/lib/expense-cadence-type";

export default async function ExpenseTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const fromQuery =
    sp.type != null && sp.type !== "" ? parseExpenseCadenceTypeParam(sp.type) : null;

  return (
    <Suspense fallback={<DashboardSkeleton variant="page" />}>
      <ExpenseCashflowPage
        pageVariant="expenses"
        initialExpenseCadence={fromQuery ?? undefined}
      />
    </Suspense>
  );
}

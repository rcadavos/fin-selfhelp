import { Suspense } from "react";
import { notFound } from "next/navigation";
import { dehydrate } from "@tanstack/react-query";
import { loadBill } from "@/actions/bills";
import { PlannedExpenseDetailBoard } from "@/components/dashboard/planned-expense-detail-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { accountsQueryOptions } from "@/lib/query/accounts";
import { billsDataQueryOptions, billPaymentsHistoryQueryOptions } from "@/lib/query/bills";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { vehiclesQueryOptions } from "@/lib/query/vehicles";

export default async function PlannedExpenseDetailPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId } = await params;
  const { bill } = await loadBill(billId);
  if (!bill) notFound();

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(billsDataQueryOptions()),
    queryClient.prefetchQuery(billPaymentsHistoryQueryOptions(billId)),
    queryClient.prefetchQuery(accountsQueryOptions()),
    queryClient.prefetchQuery(categoriesQueryOptions()),
    queryClient.prefetchQuery(vehiclesQueryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DashboardSkeleton variant="page" />}>
        <PlannedExpenseDetailBoard bill={bill} />
      </Suspense>
    </HydrationBoundary>
  );
}

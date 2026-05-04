import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { AccountsBoard } from "@/components/dashboard/accounts-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import {
  accountsQueryOptions,
  accountTotalsQueryOptions,
} from "@/lib/query/accounts";
import { getCurrentPaidMonth } from "@/lib/paid-month";

export default async function AccountsPage() {
  const queryClient = getQueryClient();
  const paidMonth = getCurrentPaidMonth();
  await Promise.all([
    queryClient.prefetchQuery(accountsQueryOptions()),
    queryClient.prefetchQuery(accountTotalsQueryOptions(paidMonth)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DashboardSkeleton variant="page" />}>
        <AccountsBoard />
      </Suspense>
    </HydrationBoundary>
  );
}

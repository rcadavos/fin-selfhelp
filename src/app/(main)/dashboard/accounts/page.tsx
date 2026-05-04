import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { AccountsBoard } from "@/components/dashboard/accounts-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import {
  accountsQueryOptions,
  accountBalancesQueryOptions,
  netBalanceHistoryQueryOptions,
} from "@/lib/query/accounts";

export default async function AccountsPage() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(accountsQueryOptions()),
    queryClient.prefetchQuery(accountBalancesQueryOptions()),
    queryClient.prefetchQuery(netBalanceHistoryQueryOptions(7)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DashboardSkeleton variant="page" />}>
        <AccountsBoard />
      </Suspense>
    </HydrationBoundary>
  );
}

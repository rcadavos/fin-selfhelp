import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { AccountsBoard } from "@/components/dashboard/accounts-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { NET_BALANCE_HISTORY_DAYS } from "@/lib/constants/accounts";
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
    // Same day count as AccountsBoard reads, or its query misses this prefetch and suspends.
    queryClient.prefetchQuery(netBalanceHistoryQueryOptions(NET_BALANCE_HISTORY_DAYS)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DashboardSkeleton variant="page" />}>
        <AccountsBoard />
      </Suspense>
    </HydrationBoundary>
  );
}

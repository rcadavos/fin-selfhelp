import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { ReferralsBoard } from "@/components/dashboard/referrals-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { referralSummaryQueryOptions } from "@/lib/query/referrals";

export default async function ReferralsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(referralSummaryQueryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DashboardSkeleton variant="page" />}>
        <ReferralsBoard />
      </Suspense>
    </HydrationBoundary>
  );
}

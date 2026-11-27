import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { GoalsBoard } from "@/components/dashboard/goals-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { goalsQueryOptions } from "@/lib/query/my-goals";

export default async function GoalsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(goalsQueryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DashboardSkeleton variant="page" />}>
        <GoalsBoard />
      </Suspense>
    </HydrationBoundary>
  );
}

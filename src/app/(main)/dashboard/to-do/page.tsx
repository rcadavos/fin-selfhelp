import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { RemindersBoard } from "@/components/dashboard/reminders/reminders-board";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { subscriptionCapabilitiesQueryOptions } from "@/lib/query/subscription-user";
import { toDoItemsQueryOptions } from "@/lib/query/to-buy-to-do-lists";

export default async function ToDoPage() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(toDoItemsQueryOptions()),
    queryClient.prefetchQuery(subscriptionCapabilitiesQueryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<DashboardSkeleton variant="page" />}>
        <RemindersBoard />
      </Suspense>
    </HydrationBoundary>
  );
}

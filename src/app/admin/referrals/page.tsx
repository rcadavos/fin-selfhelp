import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminReferralsBoard } from "@/components/admin/admin-referrals-board";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { adminReferralStatsQueryOptions } from "@/lib/query/referrals";

/**
 * RSC shell so the table is server-rendered. A `"use client"` page with a bare
 * `useSuspenseQuery` would dispatch the server action during SSR — which throws
 * inside Next's action queue — burn React Query's retries, and stream only the
 * spinner. The admin guard lives in src/app/admin/layout.tsx.
 */
export default async function AdminReferralsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(adminReferralStatsQueryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <main className="flex min-h-[50vh] items-center justify-center px-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </main>
        }
      >
        <AdminReferralsBoard />
      </Suspense>
    </HydrationBoundary>
  );
}

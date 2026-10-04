import { Suspense } from "react";
import { dehydrate } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AdminSupportInbox } from "@/components/admin/admin-support-inbox";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { adminSupportRequestsQueryOptions } from "@/lib/query/support-requests";

/**
 * RSC shell so the inbox is server-rendered (see src/app/admin/referrals/page.tsx
 * for why a bare client `useSuspenseQuery` page doesn't work here). The admin
 * guard lives in src/app/admin/layout.tsx.
 */
export default async function AdminSupportPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(adminSupportRequestsQueryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={
          <main className="flex min-h-[50vh] items-center justify-center px-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </main>
        }
      >
        <AdminSupportInbox />
      </Suspense>
    </HydrationBoundary>
  );
}

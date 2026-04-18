import { dehydrate } from "@tanstack/react-query";
import { AppShell } from "@/components/app/app-shell";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  noIndex: false,
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(categoriesQueryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="app-layout app-layout--shell">
        <AppShell>{children}</AppShell>
      </div>
    </HydrationBoundary>
  );
}

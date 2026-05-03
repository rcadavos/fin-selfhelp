import { redirect } from "next/navigation";
import { dehydrate } from "@tanstack/react-query";
import { AppShell } from "@/components/app/app-shell";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { buildPageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  noIndex: false,
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !user.user_metadata?.onboarding_complete) {
    redirect("/setup");
  }

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

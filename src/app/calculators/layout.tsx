import { dehydrate } from "@tanstack/react-query";
import { AppShell } from "@/components/app/app-shell";
import { Header } from "@/components/landing/header";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { subscriptionPlanQueryOptions } from "@/lib/query/subscription-plan";
import { buildPageMetadata } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Calculators",
  description:
    "Free Philippine-focused financial calculators: tax, savings & investment, and debt payoff. No sign-up required.",
  path: "/calculators",
});

export default async function CalculatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const queryClient = getQueryClient();
    await Promise.all([
      queryClient.prefetchQuery(categoriesQueryOptions()),
      queryClient.prefetchQuery(subscriptionPlanQueryOptions()),
    ]);

    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="app-layout app-layout--shell">
          <AppShell>{children}</AppShell>
        </div>
      </HydrationBoundary>
    );
  }

  return (
    <div className="min-h-0 flex-1 bg-background">
      <Header />
      <main>{children}</main>
    </div>
  );
}

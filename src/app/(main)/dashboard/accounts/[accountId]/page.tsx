import { Suspense } from "react";
import { notFound } from "next/navigation";
import { dehydrate } from "@tanstack/react-query";
import { loadAccount } from "@/actions/accounts";
import { AccountDetailBoard } from "@/components/dashboard/account-detail-board";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HydrationBoundary } from "@/components/providers/hydration-boundary";
import { getQueryClient } from "@/lib/query/query-client";
import { accountsQueryOptions } from "@/lib/query/accounts";
import { accountTransactionsQueryOptions } from "@/lib/query/account-transactions";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return (
    <Suspense fallback={<DashboardSkeleton variant="page" />}>
      <AccountDetailContent accountId={accountId} />
    </Suspense>
  );
}

async function AccountDetailContent({ accountId }: { accountId: string }) {
  const { account } = await loadAccount(accountId);
  if (!account) notFound();

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(accountsQueryOptions()),
    queryClient.prefetchQuery(accountTransactionsQueryOptions(accountId)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AccountDetailBoard account={account} />
    </HydrationBoundary>
  );
}

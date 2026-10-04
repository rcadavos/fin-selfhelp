import { useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { Suspense } from "react";

import { sortAccountsCashFirst } from "@shared/accounts";

import { AccountList, AccountListSkeleton } from "@/components/accounts/account-list";
import { EmptyAccounts } from "@/components/accounts/empty-accounts";
import { Screen } from "@/components/app/screen";
import { accountBalancesQueryOptions, accountsQueryOptions, refetchAccountQueries } from "@/lib/query/accounts";

export { RouteErrorBoundary as ErrorBoundary } from "@/components/app/route-error-boundary";

export default function AccountsScreen() {
  const queryClient = useQueryClient();

  return (
    <Screen
      title="Accounts"
      subtitle="Live balances • starting balance plus every transaction."
      onRefresh={() => refetchAccountQueries(queryClient)}
    >
      <Suspense fallback={<AccountListSkeleton rows={5} />}>
        <AccountsContent />
      </Suspense>
    </Screen>
  );
}

function AccountsContent() {
  const [{ data: accounts }, { data: balances }] = useSuspenseQueries({
    queries: [accountsQueryOptions(), accountBalancesQueryOptions()],
  });

  if (accounts.length === 0) return <EmptyAccounts />;
  return <AccountList accounts={sortAccountsCashFirst(accounts)} balances={balances} />;
}

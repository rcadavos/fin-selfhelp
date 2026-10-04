import { useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Suspense } from "react";
import { Text } from "react-native";

import { computeNetBalance, sortAccountsCashFirst } from "@shared/accounts";

import { AccountList, AccountListSkeleton } from "@/components/accounts/account-list";
import { EmptyAccounts } from "@/components/accounts/empty-accounts";
import { NetBalanceCard, NetBalanceCardSkeleton } from "@/components/accounts/net-balance-card";
import { Screen, ScreenSection } from "@/components/app/screen";
import { useUser } from "@/contexts/user-context";
import { accountBalancesQueryOptions, accountsQueryOptions, refetchAccountQueries } from "@/lib/query/accounts";
import { getFirstName, getGreeting } from "@/lib/utils/user";

export { RouteErrorBoundary as ErrorBoundary } from "@/components/app/route-error-boundary";

const DASHBOARD_ACCOUNT_LIMIT = 5;

export default function DashboardScreen() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const firstName = getFirstName(user);

  return (
    <Screen
      title={firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
      subtitle="Here's where your money stands."
      onRefresh={() => refetchAccountQueries(queryClient)}
    >
      <Suspense
        fallback={
          <>
            <NetBalanceCardSkeleton />
            <AccountListSkeleton />
          </>
        }
      >
        <DashboardContent />
      </Suspense>
    </Screen>
  );
}

function DashboardContent() {
  // One call so both requests start together instead of the second waiting on the first.
  const [{ data: accounts }, { data: balances }] = useSuspenseQueries({
    queries: [accountsQueryOptions(), accountBalancesQueryOptions()],
  });

  const includedCount = accounts.filter((a) => a.include_in_net_balance).length;
  const shown = sortAccountsCashFirst(accounts).slice(0, DASHBOARD_ACCOUNT_LIMIT);

  return (
    <>
      <NetBalanceCard amount={computeNetBalance(accounts, balances)} includedCount={includedCount} />
      <ScreenSection
        title="Accounts"
        action={
          accounts.length > DASHBOARD_ACCOUNT_LIMIT ? (
            <Link href="/accounts">
              <Text className="text-sm font-medium text-primary">See all</Text>
            </Link>
          ) : null
        }
      >
        {accounts.length === 0 ? <EmptyAccounts /> : <AccountList accounts={shown} balances={balances} />}
      </ScreenSection>
    </>
  );
}

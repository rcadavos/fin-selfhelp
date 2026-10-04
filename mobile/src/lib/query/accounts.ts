import { queryOptions, type QueryClient } from "@tanstack/react-query";

import { loadAccountBalances, loadAccounts } from "@/lib/api/accounts";
import { queryKeys } from "@/lib/query/keys";

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.accounts(),
    queryFn: loadAccounts,
  });

export const accountBalancesQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.accountBalances(),
    queryFn: loadAccountBalances,
  });

/** Refetches accounts and their balances (the balances key sits under the accounts key). */
export function refetchAccountQueries(queryClient: QueryClient) {
  return queryClient.refetchQueries({ queryKey: queryKeys.accounts() });
}

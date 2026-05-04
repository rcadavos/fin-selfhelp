import { queryOptions, QueryClient } from "@tanstack/react-query";
import { loadAccounts, loadAccountBalances, loadNetBalanceHistory } from "@/actions/accounts";
import { queryKeys } from "./keys";

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.accounts(),
    queryFn: () => Promise.resolve().then(async () => {
      const res = await loadAccounts();
      if (res.error) throw new Error(res.error);
      return res.accounts;
    }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const accountBalancesQueryOptions = () =>
  queryOptions({
    queryKey: [...queryKeys.accounts(), "balances"] as const,
    queryFn: () => Promise.resolve().then(async () => {
      const res = await loadAccountBalances();
      if (res.error) throw new Error(res.error);
      return res.balances;
    }),
    refetchOnWindowFocus: false,
  });

export const netBalanceHistoryQueryOptions = (days = 7) =>
  queryOptions({
    queryKey: queryKeys.netBalanceHistory(days),
    queryFn: () => Promise.resolve().then(async () => {
      const res = await loadNetBalanceHistory(days);
      if (res.error) throw new Error(res.error);
      return res.series;
    }),
    refetchOnWindowFocus: false,
  });

export function invalidateAccountQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.accounts() });
}

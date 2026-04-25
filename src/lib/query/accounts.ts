import { queryOptions, QueryClient } from "@tanstack/react-query";
import { loadAccounts, loadAccountTotals } from "@/actions/accounts";
import { queryKeys } from "./keys";
import { getCurrentPaidMonth } from "@/lib/paid-month";

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.accounts(),
    queryFn: async () => {
      const res = await loadAccounts();
      if (res.error) throw new Error(res.error);
      return res.accounts;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const accountTotalsQueryOptions = (paidMonth?: string) => {
  const month = paidMonth ?? getCurrentPaidMonth();
  return queryOptions({
    queryKey: [...queryKeys.accounts(), "totals", month] as const,
    queryFn: async () => {
      const res = await loadAccountTotals(month);
      if (res.error) throw new Error(res.error);
      return res;
    },
  });
};

export function invalidateAccountQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.accounts() });
}

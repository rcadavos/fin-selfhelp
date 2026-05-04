import { queryOptions, QueryClient } from "@tanstack/react-query";
import { loadAccountTransactions } from "@/actions/account-transactions";
import { queryKeys } from "./keys";

export const accountTransactionsQueryOptions = (accountId: string) =>
  queryOptions({
    queryKey: queryKeys.accountTransactions(accountId),
    queryFn: () => Promise.resolve().then(async () => {
      const res = await loadAccountTransactions(accountId);
      if (res.error) throw new Error(res.error);
      return { transactions: res.transactions, balance: res.balance };
    }),
    refetchOnWindowFocus: false,
  });

export function invalidateAccountTransactions(queryClient: QueryClient, accountId: string) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.accountTransactions(accountId) });
}

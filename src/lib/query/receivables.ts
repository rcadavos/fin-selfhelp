import { queryOptions } from "@tanstack/react-query";
import { loadReceivables, loadPendingLinksForDebtor } from "@/actions/receivables";
import { queryKeys } from "./keys";

export function receivablesQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.receivables(),
    queryFn: () => loadReceivables(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function pendingReceivableLinksQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.pendingReceivableLinks(),
    queryFn: () => loadPendingLinksForDebtor(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

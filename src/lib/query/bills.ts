import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { loadBillsData, loadBillPaymentsHistory, type BillsData } from "@/actions/bills";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { queryKeys } from "./keys";

export function billsDataQueryOptions(paidMonth?: string) {
  const month =
    paidMonth && /^\d{4}-\d{2}$/.test(paidMonth) ? paidMonth : getCurrentPaidMonth();
  return queryOptions({
    queryKey: queryKeys.billData(month),
    queryFn: () => Promise.resolve().then((): Promise<BillsData | null> => loadBillsData(month)),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function billPaymentsHistoryQueryOptions(billId: string) {
  return queryOptions({
    queryKey: queryKeys.billPaymentsHistory(billId),
    queryFn: () => loadBillPaymentsHistory(billId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function invalidateBillPaymentsHistory(queryClient: QueryClient, billId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.billPaymentsHistory(billId) });
}

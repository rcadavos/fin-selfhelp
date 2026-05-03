import { queryOptions } from "@tanstack/react-query";
import { loadBillsData, type BillsData } from "@/actions/bills";
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

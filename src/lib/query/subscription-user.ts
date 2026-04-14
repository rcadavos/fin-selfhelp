import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { getSubscriptionStatus } from "@/actions/budget";
import { getSubscriptionCapabilities } from "@/actions/subscription-capabilities";
import { getMyPaymentHistory, type SubscriptionPaymentRow } from "@/actions/receipts";
import { queryKeys } from "./keys";

export function subscriptionStatusQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.subscriptionStatus(),
    queryFn: (): Promise<Awaited<ReturnType<typeof getSubscriptionStatus>>> => getSubscriptionStatus(),
  });
}

export function subscriptionCapabilitiesQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.subscriptionCapabilities(),
    queryFn: (): Promise<Awaited<ReturnType<typeof getSubscriptionCapabilities>>> =>
      getSubscriptionCapabilities(),
  });
}

export function subscriptionPaymentsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.subscriptionPayments(),
    queryFn: async (): Promise<SubscriptionPaymentRow[]> => {
      const res = await getMyPaymentHistory();
      if (res.error) throw new Error(res.error);
      return res.payments ?? [];
    },
  });
}

/** Refresh all subscription-user queries; use after payment or tier changes. */
export function invalidateSubscriptionQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "subscription"] });
}

/** Subscription tier also affects expense caps; invalidate both after upgrade/downgrade. */
export function invalidateSubscriptionAndExpenseQueries(queryClient: QueryClient) {
  return Promise.all([
    invalidateSubscriptionQueries(queryClient),
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "expenses"] }),
  ]);
}

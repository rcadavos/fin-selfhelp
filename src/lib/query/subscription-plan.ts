import { queryOptions } from "@tanstack/react-query";
import {
  getSubscriptionPlan,
  type SubscriptionPlanRow,
} from "@/actions/subscription-plan";
import { queryKeys } from "./keys";

/** Used when DB has no row yet (landing, payment shell, query cache). */
export const SUBSCRIPTION_PLAN_FALLBACK: SubscriptionPlanRow = {
  id: "default",
  name: "Pro",
  priceAmount: 3,
  priceCurrency: "USD",
  interval: "month",
  originalPriceAmount: 20,
};

export const subscriptionPlanQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.subscriptionPlan(),
    queryFn: async () => {
      const plan = await getSubscriptionPlan();
      return plan ?? SUBSCRIPTION_PLAN_FALLBACK;
    },
  });

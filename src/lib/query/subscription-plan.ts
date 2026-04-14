import { queryOptions } from "@tanstack/react-query";
import {
  getSubscriptionPlan,
  getSubscriptionPlans,
  type SubscriptionPlanRow,
} from "@/actions/subscription-plan";
import { queryKeys } from "./keys";

/** Used when DB has no row yet (landing, payment shell, query cache). */
export const SUBSCRIPTION_PLAN_FALLBACK: SubscriptionPlanRow = {
  id: "pro",
  name: "Pro",
  priceAmount: 3,
  priceCurrency: "USD",
  interval: "month",
  originalPriceAmount: 20,
};

export const SUBSCRIPTION_PREMIUM_FALLBACK: SubscriptionPlanRow = {
  id: "premium",
  name: "Premium",
  priceAmount: 9.99,
  priceCurrency: "USD",
  interval: "month",
  originalPriceAmount: null,
};

export const subscriptionPlanQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.subscriptionPlan(),
    queryFn: async () => {
      const plan = await getSubscriptionPlan();
      return plan ?? SUBSCRIPTION_PLAN_FALLBACK;
    },
  });

export const subscriptionPlansQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: async () => {
      const { pro, premium } = await getSubscriptionPlans();
      return {
        pro: pro ?? SUBSCRIPTION_PLAN_FALLBACK,
        premium: premium ?? SUBSCRIPTION_PREMIUM_FALLBACK,
      };
    },
  });

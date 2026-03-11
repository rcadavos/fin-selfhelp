import { queryOptions } from "@tanstack/react-query";
import { getSubscriptionPlan } from "@/actions/subscription-plan";
import { queryKeys } from "./keys";

const DEFAULT_PLAN = {
  id: "default",
  name: "Pro",
  priceAmount: 3,
  priceCurrency: "USD",
  interval: "month",
  originalPriceAmount: 20 as number | null,
};

export const subscriptionPlanQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.subscriptionPlan(),
    queryFn: async () => {
      const plan = await getSubscriptionPlan();
      return plan ?? DEFAULT_PLAN;
    },
  });

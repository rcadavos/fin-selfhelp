import { queryOptions } from "@tanstack/react-query";
import { getSubscriptionPlanForAdmin } from "@/actions/subscription-plan";
import { queryKeys } from "./keys";

export const adminPricingQueryOptions = () =>
  queryOptions({
    queryKey: [...queryKeys.adminUsers().slice(0, -1), "pricing"] as const,
    queryFn: async () => {
      const { plan, error } = await getSubscriptionPlanForAdmin();
      if (error) throw new Error(error);
      return plan;
    },
  });

import { queryOptions } from "@tanstack/react-query";
import { getSubscriptionPlansForAdmin } from "@/actions/subscription-plan";
import { queryKeys } from "./keys";

export const adminPricingQueryOptions = () =>
  queryOptions({
    queryKey: [...queryKeys.all, "admin", "pricing", "plans"] as const,
    queryFn: () => Promise.resolve().then(async () => {
      const { plans, error } = await getSubscriptionPlansForAdmin();
      if (error) throw new Error(error);
      return plans;
    }),
  });

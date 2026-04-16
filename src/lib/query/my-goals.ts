import { queryOptions } from "@tanstack/react-query";
import { loadGoals } from "@/actions/goals";
import { queryKeys } from "./keys";

export const goalsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.goals(),
    queryFn: async () => {
      const res = await loadGoals();
      if (res.error) throw new Error(res.error);
      return res.goals;
    },
    /** Goals only change via this UI; mutations call `invalidateQueries`. Avoid refetch-on-focus churn. */
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

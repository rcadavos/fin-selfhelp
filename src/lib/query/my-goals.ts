import { queryOptions } from "@tanstack/react-query";
import { loadGoalDeposits, loadGoals } from "@/actions/goals";
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

export const goalDepositsQueryOptions = (goalId: string) =>
  queryOptions({
    queryKey: queryKeys.goalDeposits(goalId),
    queryFn: async () => {
      const res = await loadGoalDeposits(goalId);
      if (res.error) throw new Error(res.error);
      return res.deposits;
    },
    enabled: !!goalId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

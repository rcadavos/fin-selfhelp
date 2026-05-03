import { queryOptions } from "@tanstack/react-query";
import { touchAndGetStreak, type UserStreakData } from "@/actions/streaks";
import { queryKeys } from "./keys";

export function userStreakQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.userStreak(),
    queryFn: () => Promise.resolve().then((): Promise<UserStreakData> => touchAndGetStreak()),
    staleTime: 1000 * 60 * 30,
  });
}

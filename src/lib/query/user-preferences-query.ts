import { queryOptions } from "@tanstack/react-query";
import { fetchUserPreferencesFromDb } from "@/actions/user-preferences";
import { queryKeys } from "./keys";

export function userPreferencesQueryOptions(userId: string | undefined) {
  return queryOptions({
    queryKey: queryKeys.userPreferences(userId),
    queryFn: () => Promise.resolve().then(() => fetchUserPreferencesFromDb()),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

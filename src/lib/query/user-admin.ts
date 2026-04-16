import { queryOptions } from "@tanstack/react-query";
import { getIsAdmin } from "@/actions/admin";
import { queryKeys } from "./keys";

/** Shared across AppHeader + AppSidebar — one network call for both. */
export function userIsAdminQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.userIsAdmin(),
    queryFn: () => getIsAdmin(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { loadMyNotifications } from "@/actions/notifications";
import type { AppNotification } from "@/types/notifications";
import { queryKeys } from "./keys";

export function notificationsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.notifications(),
    queryFn: () => Promise.resolve().then(async (): Promise<AppNotification[]> => {
      const res = await loadMyNotifications();
      if (res.error) throw new Error(res.error);
      return res.items;
    }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * The list never goes stale on its own, so anything that changes what it shows must
 * call this. Paying, unpaying or carrying over a bill hides or shows its reminders.
 */
export function invalidateNotificationQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
}

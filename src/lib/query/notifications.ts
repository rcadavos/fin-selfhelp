import { queryOptions } from "@tanstack/react-query";
import { loadMyNotifications } from "@/actions/notifications";
import type { AppNotification } from "@/types/notifications";
import { queryKeys } from "./keys";

export function notificationsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.notifications(),
    queryFn: async (): Promise<AppNotification[]> => {
      const res = await loadMyNotifications();
      if (res.error) throw new Error(res.error);
      return res.items;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { getSupportRequestsForAdmin, type AdminSupportInbox } from "@/actions/support";
import { queryKeys } from "./keys";

/** Admin: "Contact support" messages from the landing-page chat, plus open/resolved totals. */
export const adminSupportRequestsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.adminSupportRequests(),
    queryFn: () => Promise.resolve().then(async (): Promise<AdminSupportInbox> => {
      const res = await getSupportRequestsForAdmin();
      if (res.error) throw new Error(res.error);
      return res.inbox;
    }),
    refetchOnWindowFocus: false,
  });

/** Refresh the inbox after a request is resolved, reopened or deleted. */
export function invalidateAdminSupportRequests(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.adminSupportRequests() });
}

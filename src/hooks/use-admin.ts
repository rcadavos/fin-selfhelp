"use client";

import { useQuery } from "@tanstack/react-query";
import { userIsAdminQueryOptions } from "@/lib/query/user-admin";

/** Shared React Query cache — safe to call from AppHeader and AppSidebar without duplicate fetches. */
export function useIsAdmin(enabled: boolean = true) {
  const q = useQuery({
    ...userIsAdminQueryOptions(),
    enabled,
  });
  return { isAdmin: q.data ?? false, loading: enabled && q.isPending };
}

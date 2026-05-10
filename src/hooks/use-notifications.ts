"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import { useUser } from "@/hooks/use-user";
import { notificationsQueryOptions } from "@/lib/query/notifications";
import { queryKeys } from "@/lib/query/keys";
import type { AppNotification } from "@/types/notifications";

type UseNotificationsResult = {
  items: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  isMarkingRead: boolean;
  isMarkingAllRead: boolean;
};

export function useNotifications(): UseNotificationsResult {
  const queryClient = useQueryClient();
  const { user, loading } = useUser();

  const query = useQuery({
    ...notificationsQueryOptions(),
    enabled: Boolean(user) && !loading,
  });

  const items = query.data ?? [];
  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
  }, [queryClient]);

  const markReadMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await markNotificationRead(id);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  const markAllMut = useMutation({
    mutationFn: async () => {
      const res = await markAllNotificationsRead();
      if (res.error) throw new Error(res.error);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications() });
      const previous = queryClient.getQueryData<AppNotification[]>(queryKeys.notifications());
      queryClient.setQueryData<AppNotification[]>(queryKeys.notifications(), (old) =>
        old ? old.map((n) => ({ ...n, read: true })) : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.notifications(), context.previous);
      }
    },
    onSettled: invalidate,
  });

  const markRead = useCallback(
    (id: string) => {
      markReadMut.mutate(id);
    },
    [markReadMut]
  );

  const markAllRead = useCallback(() => {
    markAllMut.mutate();
  }, [markAllMut]);

  return {
    items,
    unreadCount,
    markRead,
    markAllRead,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    isMarkingRead: markReadMut.isPending,
    isMarkingAllRead: markAllMut.isPending,
  };
}

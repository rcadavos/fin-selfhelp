"use client";

import { useCallback, useRef } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { replaceMyToDoOnServer } from "@/actions/to-do-db";
import { useUser } from "@/hooks/use-user";
import { queryKeys } from "@/lib/query/keys";
import { orderItemsLikeNotes, toDoItemsQueryOptions } from "@/lib/query/to-buy-to-do-lists";
import {
  clearToDoLocalStorage,
  generateToBuyItemId,
  saveToDoItems,
  type ToBuyCategory,
  type ToBuyItem,
} from "@/lib/to-buy-storage";

export type ReminderDraft = { name: string; category: ToBuyCategory; targetDate: string | null };

export type ReminderPatch = Partial<Pick<ToBuyItem, "name" | "category" | "checked" | "targetDate">>;

/**
 * The reminders list with optimistic edits. Each change updates the cache at once and then
 * saves the whole list, which is how the server action works (it replaces every row).
 */
export function useReminders() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { data: items } = useSuspenseQuery(toDoItemsQueryOptions());
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  // Read the cache rather than the render's `items`, so two quick taps don't undo each other.
  const current = useCallback(
    () => queryClient.getQueryData<ToBuyItem[]>(queryKeys.toDoItems()) ?? [],
    [queryClient]
  );

  const persist = useCallback(
    (next: ToBuyItem[]) => {
      void queryClient.cancelQueries({ queryKey: queryKeys.toDoItems() });
      queryClient.setQueryData(queryKeys.toDoItems(), orderItemsLikeNotes(next));

      // A save deletes and re-inserts every row, so overlapping saves could collide.
      // Run them one after another, each sending the newest list.
      saveQueue.current = saveQueue.current.then(async () => {
        const latest = current();
        if (!user) {
          saveToDoItems(latest);
          return;
        }
        try {
          const { error } = await replaceMyToDoOnServer(latest);
          if (error) saveToDoItems(latest);
          else clearToDoLocalStorage();
        } catch {
          saveToDoItems(latest);
        }
      });
    },
    [queryClient, user, current]
  );

  const add = useCallback(
    (draft: ReminderDraft) => {
      persist([
        ...current(),
        {
          id: generateToBuyItemId(),
          name: draft.name,
          quantity: 1,
          estimatedPrice: "",
          category: draft.category,
          checked: false,
          targetDate: draft.targetDate,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [persist, current]
  );

  const update = useCallback(
    (id: string, patch: ReminderPatch) => {
      persist(current().map((it) => (it.id === id ? { ...it, ...patch } : it)));
    },
    [persist, current]
  );

  const toggle = useCallback(
    (id: string) => {
      persist(current().map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
    },
    [persist, current]
  );

  const remove = useCallback(
    (ids: string[]) => {
      const drop = new Set(ids);
      persist(current().filter((it) => !drop.has(it.id)));
    },
    [persist, current]
  );

  return { items, add, update, toggle, remove };
}

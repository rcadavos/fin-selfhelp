import { queryOptions } from "@tanstack/react-query";
import { loadMyToBuyFromServer, replaceMyToBuyOnServer } from "@/actions/to-buy-db";
import { loadMyToDoFromServer, replaceMyToDoOnServer } from "@/actions/to-do-db";
import {
  clearToBuyLocalStorage,
  clearToDoLocalStorage,
  getToBuyItems,
  getToDoItems,
  type ToBuyItem,
} from "@/lib/to-buy-storage";
import { queryKeys } from "./keys";

function orderItemsLikeNotes(list: ToBuyItem[]): ToBuyItem[] {
  const open = list.filter((i) => !i.checked);
  const done = list.filter((i) => i.checked);
  return [...open, ...done];
}

type LoadResult = { error?: string; items?: ToBuyItem[] };

async function resolveListAfterServerLoad(
  load: () => Promise<LoadResult>,
  replace: (items: ToBuyItem[]) => Promise<{ error?: string }>,
  getLocal: () => ToBuyItem[],
  clearLocal: () => void
): Promise<ToBuyItem[]> {
  const { items: remote, error } = await load();
  if (error) return orderItemsLikeNotes(getLocal());
  let list = remote ?? [];
  if (list.length === 0) {
    const local = getLocal();
    if (local.length > 0) {
      const ordered = orderItemsLikeNotes(local);
      const { error: syncErr } = await replace(ordered);
      if (!syncErr) {
        clearLocal();
        const again = await load();
        list = again.items ?? [];
      }
    }
  }
  return orderItemsLikeNotes(list);
}

export function toBuyItemsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.toBuyItems(),
    queryFn: () =>
      resolveListAfterServerLoad(
        loadMyToBuyFromServer,
        replaceMyToBuyOnServer,
        getToBuyItems,
        clearToBuyLocalStorage
      ),
  });
}

export function toDoItemsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.toDoItems(),
    queryFn: () =>
      resolveListAfterServerLoad(
        loadMyToDoFromServer,
        replaceMyToDoOnServer,
        getToDoItems,
        clearToDoLocalStorage
      ),
  });
}

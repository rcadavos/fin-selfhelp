"use client";

import { useSyncExternalStore } from "react";
import { formatYmdLocal } from "@/lib/expense-due-date";

// Re-read once a minute so a page left open past midnight moves on to the new day.
function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

const getToday = () => formatYmdLocal(new Date());
const getServerToday = () => null;

/**
 * Today as `YYYY-MM-DD` in the viewer's own timezone, or null while server rendering and
 * hydrating. The server runs in UTC, so its "today" can be a day behind a viewer in Manila;
 * rendering date-dependent UI only once this is known keeps server and client markup equal.
 */
export function useTodayYmd(): string | null {
  return useSyncExternalStore(subscribe, getToday, getServerToday);
}

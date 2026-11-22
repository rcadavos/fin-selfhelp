"use client";

import { useMemo, useSyncExternalStore } from "react";
import { formatYmdLocal } from "@/lib/expense-due-date";

// Ticks often enough for "in 5m" countdowns; React only re-renders when the minute changes.
function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(id);
}

function getSnapshot(): string {
  const now = new Date();
  return `${formatYmdLocal(now)} ${now.getHours() * 60 + now.getMinutes()}`;
}

const getServerSnapshot = () => null;

export type LocalClock = {
  /** Today as `YYYY-MM-DD` in the viewer's timezone. */
  todayYmd: string;
  /** Minutes since local midnight. */
  nowMinutes: number;
};

/**
 * The viewer's local date and minute, or null while server rendering and hydrating.
 * The server runs in UTC, so its "today" can be a day behind a viewer in Manila;
 * rendering time-dependent UI only once this is known keeps server and client markup equal.
 */
export function useLocalClock(): LocalClock | null {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    if (!snapshot) return null;
    const [todayYmd, minutes] = snapshot.split(" ");
    return { todayYmd, nowMinutes: Number(minutes) };
  }, [snapshot]);
}

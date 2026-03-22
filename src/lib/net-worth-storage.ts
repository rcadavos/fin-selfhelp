/**
 * Client-only: net worth items are stored in localStorage, never sent to the database.
 */

import type { NetWorthItemRow } from "@/actions/net-worth";

const STORAGE_KEY = "net-worth-items";

export function getNetWorthItems(): NetWorthItemRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as NetWorthItemRow[];
  } catch {
    return [];
  }
}

export function saveNetWorthItems(items: NetWorthItemRow[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota or other errors
  }
}

export function generateNetWorthItemId(): string {
  return crypto.randomUUID();
}

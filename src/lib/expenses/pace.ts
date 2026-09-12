/**
 * Derivations behind the Expenses board.
 *
 * The board used to answer "what did I spend?" and never "was that a lot?" —
 * a total you cannot judge yourself against is a receipt drawer. Everything here
 * is pure, so the pace panel, the category chips and the day subtotals all read
 * the same numbers and cannot disagree with each other.
 */

import type { ExpenseEntryRow } from "@/actions/budget";
import type { MonthlyBreakdownPoint } from "@/actions/expense-payments";
import { LARGE_ENTRY_MULTIPLE } from "@/lib/constants/expenses";

export type ExpenseCategory = { id: string; label: string; bgClass: string };

export type ExpenseDayGroup = {
  /** YYYY-MM-DD, the key the entries were bucketed on. */
  dateYmd: string;
  entries: ExpenseEntryRow[];
  total: number;
};

export type CategoryTotal = {
  id: string;
  label: string;
  total: number;
};

export type SpendingPace = {
  spent: number;
  entryCount: number;
  /** 1-based day within the viewed month; the last day when viewing a past month. */
  dayOfMonth: number;
  daysInMonth: number;
  /** Straight-line projection to month end from the run rate so far. */
  projected: number;
  /** Mean monthly spend over completed months, or null with no history to compare. */
  usualMonth: number | null;
  /** Percentage the projection sits above (+) or below (−) `usualMonth`. */
  deltaPct: number | null;
  /** Share of a usual month already spent — the bar's fill. Null without history. */
  spentRatio: number | null;
  /** Share of the month elapsed — the bar's marker. */
  elapsedRatio: number;
  /** Entries at or above this are the ones that actually moved the month. */
  largeThreshold: number;
};

function ymOf(entry: ExpenseEntryRow): string | null {
  return entry.created_at ? entry.created_at.slice(0, 7) : null;
}

function ymdOf(entry: ExpenseEntryRow): string | null {
  return entry.created_at ? entry.created_at.slice(0, 10) : null;
}

/** Entries belonging to `monthYm`, newest first. */
export function entriesForMonth(
  entries: ExpenseEntryRow[],
  monthYm: string
): ExpenseEntryRow[] {
  return entries
    .filter((e) => ymOf(e) === monthYm)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

/** Buckets entries by calendar day, newest day first, each carrying its own total. */
export function buildExpenseDayGroups(entries: ExpenseEntryRow[]): ExpenseDayGroup[] {
  const byDay = new Map<string, ExpenseEntryRow[]>();
  for (const entry of entries) {
    const day = ymdOf(entry);
    if (!day) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), entry]);
  }
  return Array.from(byDay.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dateYmd, dayEntries]) => ({
      dateYmd,
      entries: dayEntries,
      total: dayEntries.reduce((sum, e) => sum + e.amount, 0),
    }));
}

/** Per-category totals for the month, largest first. Drives the filter chips. */
export function buildCategoryTotals(
  entries: ExpenseEntryRow[],
  categories: ExpenseCategory[]
): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const id = entry.category_id || "";
    totals.set(id, (totals.get(id) ?? 0) + entry.amount);
  }
  return Array.from(totals.entries())
    .map(([id, total]) => ({
      id,
      label: categories.find((c) => c.id === id)?.label ?? "Uncategorized",
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * How this month is tracking against the user's own recent months.
 *
 * Deliberately compares against history rather than a budget the user has to set
 * up first, so the panel says something useful on day one. `breakdown` is the same
 * six-month series the dashboard chart already fetches.
 */
export function summariseSpendingPace({
  entries,
  monthYm,
  breakdown,
  today = new Date(),
}: {
  entries: ExpenseEntryRow[];
  monthYm: string;
  breakdown: MonthlyBreakdownPoint[];
  today?: Date;
}): SpendingPace {
  const spent = entries.reduce((sum, e) => sum + e.amount, 0);
  const [yearStr, monthStr] = monthYm.split("-");
  const year = Number(yearStr);
  const month0 = Number(monthStr) - 1;
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month0;
  // A past month is complete, so its run rate is the whole month — no projection.
  const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;

  const projected = dayOfMonth > 0 ? (spent / dayOfMonth) * daysInMonth : 0;

  // Only completed months make a fair baseline; the current one is still filling up.
  const past = breakdown.filter((p) => p.month !== monthYm && p.expenses > 0);
  const usualMonth = past.length
    ? past.reduce((sum, p) => sum + p.expenses, 0) / past.length
    : null;

  const averageEntry = entries.length ? spent / entries.length : 0;

  return {
    spent,
    entryCount: entries.length,
    dayOfMonth,
    daysInMonth,
    projected,
    usualMonth,
    deltaPct: usualMonth && usualMonth > 0 ? ((projected - usualMonth) / usualMonth) * 100 : null,
    spentRatio: usualMonth && usualMonth > 0 ? spent / usualMonth : null,
    elapsedRatio: daysInMonth > 0 ? dayOfMonth / daysInMonth : 0,
    largeThreshold: averageEntry * LARGE_ENTRY_MULTIPLE,
  };
}

/** Case-insensitive match on the entry's own name or its category label. */
export function matchesExpenseSearch(
  entry: ExpenseEntryRow,
  name: string,
  categoryLabel: string,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q) || categoryLabel.toLowerCase().includes(q);
}

/**
 * Derivations behind the Expenses board.
 *
 * The board used to answer "what did I spend?" and never "was that a lot?" —
 * a total you cannot judge yourself against is a receipt drawer. Everything here
 * is pure, so the pace panel, its chart, the category breakdown and the day totals
 * all read the same numbers and cannot disagree with each other.
 */

import type { ExpenseEntryRow } from "@/actions/budget";
import type { MonthlyBreakdownPoint } from "@/actions/expense-payments";
import { LARGE_ENTRY_MULTIPLE } from "@/lib/constants/expenses";
import { roundToCents } from "@/lib/shared/number-format";

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
  /** How many entries make up the total. */
  count: number;
};

/** The month's running total at the end of a day; day 0 is the start of the month. */
export type CumulativeSpendPoint = { day: number; total: number };

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
  /** What a day has cost on average so far, over every elapsed day, spending or not. */
  dailyAverage: number;
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
  const totals = new Map<string, { total: number; count: number }>();
  for (const entry of entries) {
    const id = entry.category_id || "";
    const current = totals.get(id) ?? { total: 0, count: 0 };
    totals.set(id, { total: current.total + entry.amount, count: current.count + 1 });
  }
  return Array.from(totals.entries())
    .map(([id, { total, count }]) => ({
      id,
      label: categories.find((c) => c.id === id)?.label ?? "Uncategorized",
      total: roundToCents(total),
      count,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * The month's running total day by day, from day 0 (nothing spent) to `throughDay`.
 * `entries` must already belong to one month. Drives the line in the pace panel.
 */
export function buildCumulativeSpend(
  entries: ExpenseEntryRow[],
  throughDay: number
): CumulativeSpendPoint[] {
  const perDay = new Array<number>(throughDay + 1).fill(0);
  for (const entry of entries) {
    const ymd = ymdOf(entry);
    if (!ymd) continue;
    const day = Number(ymd.slice(8, 10));
    if (day >= 1 && day <= throughDay) perDay[day] += entry.amount;
  }
  const points: CumulativeSpendPoint[] = [{ day: 0, total: 0 }];
  let running = 0;
  for (let day = 1; day <= throughDay; day++) {
    running += perDay[day];
    points.push({ day, total: roundToCents(running) });
  }
  return points;
}

/** Whether an entry is one of the few that actually moved the month. */
export function isLargeEntry(amount: number, largeThreshold: number): boolean {
  return largeThreshold > 0 && amount >= largeThreshold;
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
    dailyAverage: dayOfMonth > 0 ? roundToCents(spent / dayOfMonth) : 0,
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

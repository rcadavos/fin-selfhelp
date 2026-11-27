/**
 * Derivations behind the Vehicles pages.
 *
 * Both pages read one window of spending (see `vehicleSpendingQueryOptions`) and
 * turn it into the month's total, the month before it, a trend, an average and a
 * category breakdown here, so the summary panel, the breakdown and the vehicle
 * cards all add up the same entries and cannot disagree.
 *
 * Dates are formatted by hand rather than with `toLocaleDateString`: these pages
 * render on the server, and the server's ICU and clock must produce exactly the
 * text the browser hydrates against.
 */

import type { VehicleRow, VehicleSpendEntry } from "@/actions/vehicles";
import { shiftPaidMonth } from "@/lib/paid-month";
import { isVehicleExpenseCategoryValue } from "@/lib/constants/vehicle-categories";
import {
  VEHICLE_BILL_PERIOD_MONTHS,
  VEHICLE_SPEND_CATEGORIES,
  type VehicleSpendCategoryKey,
} from "@/lib/constants/vehicles";

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = MONTHS_LONG.map((m) => m.slice(0, 3));
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseYm(ym: string): { year: number; month0: number } | null {
  const m = ym.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const month0 = Number(m[2]) - 1;
  if (month0 < 0 || month0 > 11) return null;
  return { year: Number(m[1]), month0 };
}

/** "November" (or "Nov") for a YYYY-MM key; the key itself when malformed. */
export function monthName(ym: string, style: "long" | "short" = "long"): string {
  const p = parseYm(ym);
  if (!p) return ym;
  return (style === "long" ? MONTHS_LONG : MONTHS_SHORT)[p.month0];
}

/** "Nov 2026" (or "November 2026") for a YYYY-MM key. */
export function monthYearLabel(ym: string, style: "long" | "short" = "short"): string {
  const p = parseYm(ym);
  if (!p) return ym;
  return `${monthName(ym, style)} ${p.year}`;
}

/** "Thu, 26 Nov" for a YYYY-MM-DD key. */
export function dayHeading(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return ymd;
  const year = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  const day = Number(m[3]);
  const weekday = new Date(Date.UTC(year, month0, day)).getUTCDay();
  return `${WEEKDAYS_SHORT[weekday]}, ${day} ${MONTHS_SHORT[month0] ?? ""}`.trim();
}

/** The `count` months ending at `endMonth`, oldest first. */
export function trendMonths(endMonth: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const ym = shiftPaidMonth(endMonth, -i);
    if (ym) out.push(ym);
  }
  return out;
}

/** "Honda Civic 2019", or "" when none of make, model and year is set. */
export function vehicleSubtitle(v: Pick<VehicleRow, "make" | "model" | "year">): string {
  return [v.make, v.model, v.year != null ? String(v.year) : null].filter(Boolean).join(" ");
}

export function spendCategoryOf(entry: Pick<VehicleSpendEntry, "vehicle_category">): VehicleSpendCategoryKey {
  return isVehicleExpenseCategoryValue(entry.vehicle_category) ? entry.vehicle_category : "other";
}

export function spendCategoryLabel(key: VehicleSpendCategoryKey): string {
  return VEHICLE_SPEND_CATEGORIES.find((c) => c.key === key)?.label ?? "Other";
}

/** What an entry is called in a list: its own name, else its category. */
export function entryName(entry: VehicleSpendEntry): string {
  return entry.label ?? spendCategoryLabel(spendCategoryOf(entry));
}

export type SpendCategoryTotal = {
  key: VehicleSpendCategoryKey;
  label: string;
  total: number;
  count: number;
};

/** Spending per category, largest first, leaving out categories with nothing in them. */
export function categoryTotals(entries: VehicleSpendEntry[]): SpendCategoryTotal[] {
  const byKey = new Map<VehicleSpendCategoryKey, SpendCategoryTotal>();
  for (const entry of entries) {
    const key = spendCategoryOf(entry);
    const row = byKey.get(key) ?? { key, label: spendCategoryLabel(key), total: 0, count: 0 };
    row.total += entry.amount;
    row.count += 1;
    byKey.set(key, row);
  }
  return Array.from(byKey.values())
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
}

export type MonthTotal = { month: string; total: number };

export type SpendingSummary = {
  /** Entries in the selected month, newest first. */
  monthEntries: VehicleSpendEntry[];
  total: number;
  /** The month before the selected one, or null when it is outside the window. */
  previous: MonthTotal | null;
  /** Each month of the window, oldest first, the selected month last. */
  trend: MonthTotal[];
  /**
   * Mean spend per finished month, counted from when the vehicle was added or first
   * had spending, whichever is earlier. Null when no finished month qualifies.
   */
  average: number | null;
  categories: SpendCategoryTotal[];
};

/**
 * One window of spending summarised for the month it ends on.
 *
 * `inProgressMonth` is today's month: it is left out of the average, which would
 * otherwise sink every time a new month starts. `since` is the earliest month the
 * average may count, so a vehicle added last month is not averaged over six.
 */
export function summariseSpending(
  entries: VehicleSpendEntry[],
  {
    months,
    inProgressMonth,
    since,
  }: { months: string[]; inProgressMonth: string; since: string | null },
): SpendingSummary {
  const selectedMonth = months[months.length - 1] ?? "";
  const totals = new Map<string, number>(months.map((m) => [m, 0]));
  let firstMonthWithSpend: string | null = null;
  for (const entry of entries) {
    if (!totals.has(entry.month)) continue;
    totals.set(entry.month, (totals.get(entry.month) ?? 0) + entry.amount);
    if (firstMonthWithSpend === null || entry.month < firstMonthWithSpend) firstMonthWithSpend = entry.month;
  }
  const trend = months.map((month) => ({ month, total: totals.get(month) ?? 0 }));

  const from = [since, firstMonthWithSpend].filter((m): m is string => !!m).sort()[0] ?? null;
  const counted = trend.filter((t) => t.month !== inProgressMonth && (from === null || t.month >= from));
  const average = counted.length > 0 ? counted.reduce((s, t) => s + t.total, 0) / counted.length : null;

  const monthEntries = entries
    .filter((e) => e.month === selectedMonth)
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    monthEntries,
    total: totals.get(selectedMonth) ?? 0,
    previous: trend.length > 1 ? trend[trend.length - 2] : null,
    trend,
    average,
    categories: categoryTotals(monthEntries),
  };
}

export type SpendDayGroup = { dateYmd: string; entries: VehicleSpendEntry[]; total: number };

/** Entries by calendar day, newest day first, each with the day's total. */
export function spendDayGroups(entries: VehicleSpendEntry[]): SpendDayGroup[] {
  const byDay = new Map<string, VehicleSpendEntry[]>();
  for (const entry of entries) {
    const day = entry.date.slice(0, 10);
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

/** What a bill costs per month: a quarterly bill counts a third of its amount, a yearly one a twelfth. */
export function monthlyCost(amount: number, period: keyof typeof VEHICLE_BILL_PERIOD_MONTHS): number {
  return amount / (VEHICLE_BILL_PERIOD_MONTHS[period] ?? 1);
}

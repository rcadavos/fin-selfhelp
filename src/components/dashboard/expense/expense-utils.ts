import type { ReminderDay } from "@/types/database.types";
import { effectiveDueDateInPaidMonth } from "@/lib/expense-due-date";
import type { ExpenseEntryRow } from "@/actions/budget";

export const REMINDER_DAY_SORT_ORDER: ReminderDay[] = [3, 1, 0];

export function reminderKeyFromDays(days: ReminderDay[]): string {
  const normalized = [
    ...new Set(days.filter((d): d is ReminderDay => d === 0 || d === 1 || d === 3)),
  ];
  if (normalized.length === 0) return "";
  normalized.sort(
    (a, b) => REMINDER_DAY_SORT_ORDER.indexOf(a) - REMINDER_DAY_SORT_ORDER.indexOf(b)
  );
  return normalized.join(",");
}

export function daysFromReminderKey(key: string): ReminderDay[] {
  if (!key) return [];
  const out: ReminderDay[] = [];
  for (const part of key.split(",")) {
    const n = Number(part);
    if (n === 0 || n === 1 || n === 3) out.push(n);
  }
  return [...new Set(out)];
}

export const EDIT_REMINDER_NONE = "__none__";
export const CATEGORY_SELECT_NONE = "__no_category__";

export const EDIT_REMINDER_SELECT_ITEMS: { value: string; label: string }[] = [
  { value: EDIT_REMINDER_NONE, label: "None" },
  { value: "3", label: "3 days before" },
  { value: "1", label: "1 day before" },
  { value: "0", label: "On due date" },
  { value: "3,1", label: "3 days before and 1 day before" },
  { value: "3,0", label: "3 days before and on due date" },
  { value: "1,0", label: "1 day before and on due date" },
  { value: "3,1,0", label: "All reminders" },
];

export const REMINDER_CHANNEL_ITEMS = [
  { value: "email", label: "Remind by Email" },
  { value: "in-app", label: "In-App Notification" },
  { value: "both", label: "Both Email & In-App" },
];

export function reminderSelectValueFromDays(days: ReminderDay[]): string {
  if (days.length === 0) return EDIT_REMINDER_NONE;
  const k = reminderKeyFromDays(days);
  return EDIT_REMINDER_SELECT_ITEMS.some((i) => i.value === k) ? k : EDIT_REMINDER_NONE;
}

export function groupEntriesByCategory(entries: ExpenseEntryRow[]) {
  const map = new Map<string, ExpenseEntryRow[]>();
  for (const entry of entries) {
    const list = map.get(entry.category_id) ?? [];
    list.push(entry);
    map.set(entry.category_id, list);
  }
  return map;
}

export function sortedCategoryGroupsFromEntries(
  entryList: ExpenseEntryRow[],
  orderedCategoryIds: string[]
): [string, ExpenseEntryRow[]][] {
  const g = groupEntriesByCategory(entryList);
  const pairs = Array.from(g.entries());
  const uncategorized = pairs.find(([id]) => id === "");
  const rest = pairs.filter(([id]) => id !== "");
  rest.sort((a, b) => {
    const ai = orderedCategoryIds.indexOf(a[0]);
    const bi = orderedCategoryIds.indexOf(b[0]);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a[0].localeCompare(b[0]);
  });
  return uncategorized ? [...rest, uncategorized] : rest;
}

export function getCategoryLabel(categories: { id: string; label: string }[], id: string): string {
  if (!id) return "Uncategorized";
  return categories.find((c) => c.id === id)?.label ?? id;
}

export function getCategoryBg(categories: { id: string; bgClass: string }[], id: string): string {
  return categories.find((c) => c.id === id)?.bgClass ?? "";
}

export type ExpensePayStatus = "paid" | "outstanding" | "unpaid";

export function startOfTodayLocal(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export function getExpensePayStatus(
  entry: ExpenseEntryRow,
  paidIds: Set<string>,
  paidMonthYm: string
): ExpensePayStatus {
  if (paidIds.has(entry.id)) return "paid";
  if (!entry.due_date) return "unpaid";
  const due = effectiveDueDateInPaidMonth(entry.due_date, paidMonthYm);
  if (!due) return "unpaid";
  if (due < startOfTodayLocal()) return "outstanding";
  return "unpaid";
}

export function cadenceLabel(cadence: string): string {
  if (cadence === "yearly") return "Yearly";
  if (cadence === "quarterly") return "Quarterly";
  return "Monthly";
}

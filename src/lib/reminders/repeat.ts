import { formatYmdLocal } from "@/lib/expense-due-date";
import { daysBetweenYmd, ymdToDate } from "@/lib/reminders/schedule";
import type { ReminderRepeat, ToBuyItem } from "@/lib/to-buy-storage";

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/**
 * The `n`th occurrence of a repeat counted from its anchor (n = 0 is the anchor itself).
 * Months and years keep the anchor's day, clamped to short months: a reminder on the
 * 31st falls on Feb 28 and is back on Mar 31, rather than drifting to the 28th for good.
 */
export function repeatOccurrenceYmd(anchorYmd: string, rule: ReminderRepeat, n: number): string {
  const anchor = ymdToDate(anchorYmd) ?? new Date();
  const y = anchor.getFullYear();
  const mo = anchor.getMonth();
  const d = anchor.getDate();
  switch (rule) {
    case "daily":
      return formatYmdLocal(new Date(y, mo, d + n));
    case "weekly":
      return formatYmdLocal(new Date(y, mo, d + 7 * n));
    case "monthly": {
      const target = new Date(y, mo + n, 1);
      const day = Math.min(d, daysInMonth(target.getFullYear(), target.getMonth()));
      return formatYmdLocal(new Date(target.getFullYear(), target.getMonth(), day));
    }
    case "yearly": {
      const day = Math.min(d, daysInMonth(y + n, mo));
      return formatYmdLocal(new Date(y + n, mo, day));
    }
  }
}

/** The first occurrence strictly after `afterYmd`. */
export function nextRepeatYmd(anchorYmd: string, rule: ReminderRepeat, afterYmd: string): string {
  const diff = daysBetweenYmd(anchorYmd, afterYmd);
  if (diff < 0) return anchorYmd;
  // Start just below the answer and step up; avoids walking from the anchor one by one.
  const estimate =
    rule === "daily" ? diff : rule === "weekly" ? Math.floor(diff / 7) : rule === "monthly" ? Math.floor(diff / 31) : Math.floor(diff / 366);
  let n = Math.max(0, estimate);
  let next = repeatOccurrenceYmd(anchorYmd, rule, n);
  while (next <= afterYmd) {
    n += 1;
    next = repeatOccurrenceYmd(anchorYmd, rule, n);
  }
  return next;
}

/**
 * Where a repeating reminder goes when it is checked off: the next occurrence after both
 * its current date and today. Ticking one off early moves it one step; an overdue one
 * skips the missed occurrences instead of landing in the past again.
 */
export function nextDateAfterCompleting(item: ToBuyItem, todayYmd: string): string | null {
  if (!item.repeat || !item.targetDate) return null;
  const after = item.targetDate > todayYmd ? item.targetDate : todayYmd;
  return nextRepeatYmd(item.repeatAnchor || item.targetDate, item.repeat, after);
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** "Every day", "Every Friday", "Every month on the 27th", "Every year on Nov 27". */
export function repeatLabel(rule: ReminderRepeat, anchorYmd: string | null | undefined, locale: string): string {
  const anchor = anchorYmd ? ymdToDate(anchorYmd) : null;
  switch (rule) {
    case "daily":
      return "Every day";
    case "weekly":
      return anchor ? `Every ${anchor.toLocaleDateString(locale, { weekday: "long" })}` : "Every week";
    case "monthly":
      return anchor ? `Every month on the ${ordinal(anchor.getDate())}` : "Every month";
    case "yearly":
      return anchor ? `Every year on ${anchor.toLocaleDateString(locale, { month: "short", day: "numeric" })}` : "Every year";
  }
}

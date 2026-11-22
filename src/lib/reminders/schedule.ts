import { formatYmdLocal } from "@/lib/expense-due-date";
import { REMINDER_SECTION_LABELS, type ReminderSnoozeOption } from "@/lib/constants/reminders";
import { REMINDER_CATEGORIES, type ToBuyCategory, type ToBuyItem } from "@/lib/to-buy-storage";

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` → local midnight, or null when it is not a real date. */
export function ymdToDate(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = ymdToDate(ymd) ?? new Date();
  d.setDate(d.getDate() + days);
  return formatYmdLocal(d);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetweenYmd(from: string, to: string): number {
  const a = ymdToDate(from);
  const b = ymdToDate(to);
  if (!a || !b) return 0;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOfYmd(ymd: string): number {
  return (ymdToDate(ymd) ?? new Date()).getDay();
}

export function reminderLocale(language: string | undefined): string {
  return language === "fil" ? "fil-PH" : "en-PH";
}

/** The day a snooze option moves a reminder to. "Weekend" and "Next week" always land after today. */
export function snoozeTargetYmd(option: ReminderSnoozeOption, todayYmd: string): string {
  const dow = weekdayOfYmd(todayYmd);
  switch (option) {
    case "tomorrow":
      return addDaysYmd(todayYmd, 1);
    case "weekend":
      return addDaysYmd(todayYmd, (6 - dow + 7) % 7 || 7);
    case "next-week":
      return addDaysYmd(todayYmd, (1 - dow + 7) % 7 || 7);
  }
}

function formatYmd(ymd: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  const d = ymdToDate(ymd);
  return d ? d.toLocaleDateString(locale, options) : ymd;
}

/** "Thu, Nov 19" */
export function shortDateLabel(ymd: string, locale: string): string {
  return formatYmd(ymd, locale, { weekday: "short", month: "short", day: "numeric" });
}

/** "Sunday, Nov 22" */
export function longDateLabel(ymd: string, locale: string): string {
  return formatYmd(ymd, locale, { weekday: "long", month: "short", day: "numeric" });
}

export function weekdayShortLabel(ymd: string, locale: string): string {
  return formatYmd(ymd, locale, { weekday: "short" });
}

export function dayOfMonth(ymd: string): string {
  return String(ymdToDate(ymd)?.getDate() ?? "");
}

/** Heading for a day: Today, Tomorrow, a weekday name inside the coming week, else a short date. */
export function dayHeading(ymd: string, todayYmd: string, locale: string): string {
  const diff = daysBetweenYmd(todayYmd, ymd);
  if (diff === 0) return REMINDER_SECTION_LABELS.today;
  if (diff === 1) return REMINDER_SECTION_LABELS.tomorrow;
  if (diff > 1 && diff < 7) return formatYmd(ymd, locale, { weekday: "long" });
  return shortDateLabel(ymd, locale);
}

/** When a reminder is due, phrased for a meta line: "Was due Thu, Nov 19", "Today", "Friday" … */
export function dueLabel(ymd: string | null | undefined, todayYmd: string, locale: string): string {
  if (!ymd) return "No date";
  const diff = daysBetweenYmd(todayYmd, ymd);
  if (diff < 0) return `Was due ${shortDateLabel(ymd, locale)}`;
  return dayHeading(ymd, todayYmd, locale);
}

export function isOverdue(item: ToBuyItem, todayYmd: string): boolean {
  return !item.checked && !!item.targetDate && item.targetDate < todayYmd;
}

export function reminderCategoryLabel(category: ToBuyCategory): string {
  return REMINDER_CATEGORIES.find((c) => c.value === category)?.label ?? "Other";
}

export type ReminderDayGroup = { ymd: string; items: ToBuyItem[] };

export type ReminderGroups = {
  /** Not done and dated before today, oldest first. */
  overdue: ToBuyItem[];
  /** Today onwards, soonest first; done reminders stay in their day. */
  days: ReminderDayGroup[];
  /** No date. */
  anytime: ToBuyItem[];
  /** Done and dated before today. */
  doneEarlier: ToBuyItem[];
};

/** Splits reminders by when they are due. Within a group, the stored order (open first) is kept. */
export function groupReminders(items: ToBuyItem[], todayYmd: string): ReminderGroups {
  const overdue: ToBuyItem[] = [];
  const anytime: ToBuyItem[] = [];
  const doneEarlier: ToBuyItem[] = [];
  const byDay = new Map<string, ToBuyItem[]>();

  for (const item of items) {
    const ymd = item.targetDate?.trim() || null;
    if (!ymd) {
      anytime.push(item);
    } else if (ymd < todayYmd) {
      (item.checked ? doneEarlier : overdue).push(item);
    } else {
      const list = byDay.get(ymd) ?? [];
      list.push(item);
      byDay.set(ymd, list);
    }
  }

  overdue.sort((a, b) => (a.targetDate ?? "").localeCompare(b.targetDate ?? ""));
  doneEarlier.sort((a, b) => (b.targetDate ?? "").localeCompare(a.targetDate ?? ""));
  const days = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ymd, list]) => ({ ymd, items: list }));

  return { overdue, days, anytime, doneEarlier };
}

export type ReminderWeekDay = { ymd: string; isToday: boolean; openCount: number };

/**
 * The next `length` days from today with how many reminders are still open on each.
 * Today's count also takes in overdue and undated reminders, because the Today view lists them.
 */
export function buildReminderWeek(groups: ReminderGroups, todayYmd: string, length: number): ReminderWeekDay[] {
  const openIn = (list: ToBuyItem[]) => list.filter((it) => !it.checked).length;
  return Array.from({ length }, (_, i) => {
    const ymd = addDaysYmd(todayYmd, i);
    const day = groups.days.find((g) => g.ymd === ymd);
    let openCount = day ? openIn(day.items) : 0;
    if (i === 0) openCount += groups.overdue.length + openIn(groups.anytime);
    return { ymd, isToday: i === 0, openCount };
  });
}

export type ReminderSectionKey = "overdue" | "day" | "anytime" | "later" | "doneEarlier";

export type ReminderSection = {
  key: ReminderSectionKey;
  label: string;
  items: ToBuyItem[];
  /** Counts toward the day's progress ring and "Next up". */
  countsTowardDay: boolean;
};

/**
 * What the phone view lists for the chosen day. Today is the home view, so it also carries
 * overdue and undated reminders, reminders past the week strip, and done ones from earlier days.
 * Any other day lists only that day.
 */
export function buildFocusSections(
  groups: ReminderGroups,
  todayYmd: string,
  selectedYmd: string,
  weekLength: number,
  locale: string
): ReminderSection[] {
  if (selectedYmd !== todayYmd) {
    const day = groups.days.find((g) => g.ymd === selectedYmd);
    return [
      {
        key: "day",
        label: dayHeading(selectedYmd, todayYmd, locale),
        items: day?.items ?? [],
        countsTowardDay: true,
      },
    ];
  }

  const today = groups.days.find((g) => g.ymd === todayYmd)?.items ?? [];
  const later = groups.days
    .filter((g) => daysBetweenYmd(todayYmd, g.ymd) >= weekLength)
    .flatMap((g) => g.items);

  const sections: ReminderSection[] = [
    { key: "overdue", label: REMINDER_SECTION_LABELS.overdue, items: groups.overdue, countsTowardDay: true },
    { key: "day", label: REMINDER_SECTION_LABELS.today, items: today, countsTowardDay: true },
    { key: "anytime", label: REMINDER_SECTION_LABELS.anytime, items: groups.anytime, countsTowardDay: true },
    { key: "later", label: REMINDER_SECTION_LABELS.later, items: later, countsTowardDay: false },
    { key: "doneEarlier", label: REMINDER_SECTION_LABELS.doneEarlier, items: groups.doneEarlier, countsTowardDay: false },
  ];
  return sections.filter((s) => s.items.length > 0);
}

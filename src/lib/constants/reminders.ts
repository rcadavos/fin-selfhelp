import {
  Briefcase,
  HeartPulse,
  ShoppingBag,
  ShoppingBasket,
  StickyNote,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { FREE_TIER_MAX_LIST_ITEMS } from "@/lib/subscription-tier";
import type { ReminderRepeat, ToBuyCategory } from "@/lib/to-buy-storage";

/** Days the phone view's week strip covers, starting today. */
export const REMINDER_WEEK_LENGTH = 7;

/** Category a new reminder gets when its quick-add text names none. */
export const REMINDER_DEFAULT_CATEGORY: ToBuyCategory = "personal";

/**
 * When a dated reminder notifies. The cron and in-app sync release reminders at
 * 8 AM on the target date (`isReminderReleaseHour(…, 8)`); keep this copy in step.
 */
export const REMINDER_ALERT_TIME_LABEL = "8:00 AM";

/**
 * How late the timed-reminders cron may still push a reminder. Later than this it only
 * lands in the in-app list: a buzz hours after the time is more noise than help.
 */
export const REMINDER_PUSH_GRACE_MINUTES = 120;

/** Done reminders shown in "Done earlier" before a "Show all" button. */
export const REMINDER_DONE_EARLIER_PREVIEW = 20;

export const REMINDER_CATEGORY_ICONS: Partial<Record<ToBuyCategory, LucideIcon>> = {
  meeting: Users,
  pantry: ShoppingBasket,
  errand: ShoppingBag,
  personal: User,
  work: Briefcase,
  health: HeartPulse,
  other: StickyNote,
};

export const REMINDER_FALLBACK_ICON: LucideIcon = StickyNote;

export type ReminderSnoozeOption = "tomorrow" | "weekend" | "next-week";

export const REMINDER_SNOOZE_OPTIONS: { id: ReminderSnoozeOption; label: string }[] = [
  { id: "tomorrow", label: "Tomorrow" },
  { id: "weekend", label: "Weekend" },
  { id: "next-week", label: "Next week" },
];

export const REMINDER_SECTION_LABELS = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  anytime: "Anytime",
  later: "After this week",
  doneEarlier: "Done earlier",
} as const;

export const REMINDER_QUICK_ADD_PLACEHOLDER = {
  pro: "Add a reminder… try “Pay rent fri 9am monthly”",
  free: "Add a reminder… try “Buy rice #pantry”",
} as const;

export const REMINDER_QUICK_ADD_TIP = {
  pro: "Tip: add a day and time like “fri 3pm”, a repeat like “every month”, and a #category.",
  free: "Tip: add a #category like #errand or #work.",
} as const;

/** One-tap times in the reminder details, as `HH:MM`. */
export const REMINDER_TIME_PRESETS = ["09:00", "12:00", "15:00", "18:00"] as const;

export const REMINDER_REPEAT_OPTIONS: { value: ReminderRepeat | null; label: string }[] = [
  { value: null, label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const REMINDER_PRO_DIALOG = {
  feature: "Dates, times and repeats",
  description: `Give reminders a date and time, make them repeat, snooze them to later, and get notified when they are due. Pro also removes the ${FREE_TIER_MAX_LIST_ITEMS}-reminder limit.`,
} as const;

export const REMINDER_UPGRADE_HREF = "/account/subscription";

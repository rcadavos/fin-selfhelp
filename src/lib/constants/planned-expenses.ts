import type { UrgencyBucket } from "@/lib/planned-expenses/grouping";

/** How far ahead "due this week" reaches, in days. */
export const DUE_SOON_DAYS = 7;

/**
 * How long a fully paid bill stays visible in "Recently paid" before it drops into
 * the collapsed Settled section. Marking a bill paid should not make it vanish the
 * same day — you still want to see the receipt sitting there for the week after.
 */
export const SETTLED_AFTER_DAYS = 7;

/** Group headings, per app mode. Bills mode is terser — it has no other list to disambiguate from. */
export const URGENCY_LABELS: Record<UrgencyBucket, { full: string; bills: string }> = {
  overdue: { full: "Overdue", bills: "Overdue" },
  week: { full: "Due this week", bills: "This week" },
  later: { full: "Later this month", bills: "Later this month" },
  recent: { full: "Recently paid", bills: "Recently paid" },
  settled: { full: "Settled", bills: "Settled" },
};

/** Bucket accent, used for the group heading and the row's severity rail. */
export const URGENCY_TONE: Record<UrgencyBucket, string> = {
  overdue: "text-destructive",
  week: "text-warning",
  later: "text-muted-foreground",
  recent: "text-primary",
  settled: "text-primary",
};

/** Runway marker size by share of the month's largest bill. */
export const RUNWAY_MARKER_BREAKPOINTS = { small: 0.15, medium: 0.45 } as const;

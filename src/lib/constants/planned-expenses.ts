import type {
  DayStatus,
  LedgerFilter,
  PlannedExpenseStatus,
  UrgencyBucket,
} from "@/lib/planned-expenses/grouping";
import type { StampVariant } from "@/components/passbook/stamp";

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

/** A status in one or two words, for where a stamp stands on its own (calendar popover, ledger status column). */
export const PLANNED_EXPENSE_STATUS_LABEL: Record<PlannedExpenseStatus, string> = {
  overdue: "Overdue",
  failed: "Failed",
  partial: "Part paid",
  due: "Due",
  scheduled: "Scheduled",
  paid: "Paid",
};

/** Which stamp colour each status wears. A failed auto-debit reads as overdue: it still needs paying. */
export const PLANNED_EXPENSE_STAMP_VARIANT: Record<PlannedExpenseStatus, StampVariant> = {
  paid: "paid",
  partial: "partial",
  failed: "overdue",
  overdue: "overdue",
  due: "due",
  scheduled: "scheduled",
};

/** The Bills ledger's filter tabs, shown once the ledger is wide enough for its table layout. */
export const LEDGER_FILTERS: { id: LedgerFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unpaid", label: "To pay" },
  { id: "paid", label: "Paid" },
];

/**
 * The ledger's table columns, applied once the ledger itself is at least 42rem wide
 * (`@2xl`, a container query): tick • bill • status • account or reminder • amount • menu.
 * The header row and every bill row must share one template, so it is defined once here.
 */
export const LEDGER_GRID_COLS = {
  withDetail: "@2xl:grid-cols-[1.75rem_minmax(0,1fr)_9.5rem_9rem_7.5rem_2rem]",
  plain: "@2xl:grid-cols-[1.75rem_minmax(0,1fr)_9.5rem_7.5rem_2rem]",
} as const;

/**
 * Share of an account's balance that this month's bills can claim before its
 * coverage bar turns amber — covered, but with little left over.
 */
export const COVERAGE_TIGHT_SHARE = 0.8;

/** Categories the Bills rail lists before offering "See all". */
export const CATEGORY_BREAKDOWN_LIMIT = 6;

/** Day-by-day runway bar heights in px: a day's bar scales between these by its share of the heaviest day. */
export const DAY_RUNWAY_BAR_PX = { min: 6, max: 64 } as const;

/** Fill per day status — the runway bars and their legend read from the same map. */
export const DAY_STATUS_FILL: Record<DayStatus, string> = {
  overdue: "bg-destructive",
  due: "bg-warning",
  partial: "bg-info",
  scheduled: "bg-hairline-strong",
  paid: "bg-primary/40",
};

export const DAY_STATUS_LEGEND: { status: DayStatus; label: string }[] = [
  { status: "overdue", label: "Overdue" },
  { status: "due", label: "Due soon" },
  { status: "partial", label: "Part paid" },
  { status: "scheduled", label: "Scheduled" },
  { status: "paid", label: "Paid" },
];

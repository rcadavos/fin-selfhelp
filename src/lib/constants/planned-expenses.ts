import type {
  DayStatus,
  LedgerFilter,
  PlannedExpenseStatus,
  UrgencyBucket,
} from "@/lib/planned-expenses/grouping";
import type { BillRecordStatus } from "@/lib/planned-expenses/bill-history";
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
  // The board names the month instead ("Carried to December"); this is the fallback.
  carried: { full: "Carried to next month", bills: "Carried to next month" },
  settled: { full: "Settled", bills: "Settled" },
};

/** Bucket accent, used for the group heading and the row's severity rail. */
export const URGENCY_TONE: Record<UrgencyBucket, string> = {
  overdue: "text-destructive",
  week: "text-warning",
  later: "text-muted-foreground",
  recent: "text-primary",
  carried: "text-muted-foreground",
  settled: "text-primary",
};

/** Longest note a carry-over can hold. The column allows more; this keeps the row readable. */
export const BILL_CARRY_OVER_NOTE_MAX_LENGTH = 200;

/** Plain-English text for the carry-over error codes the bill actions return. */
export const BILL_CARRY_OVER_ERRORS: Record<string, string> = {
  monthly_only: "Only monthly bills can be carried over to the next month.",
  already_carried: "This bill is already carried over to next month.",
  nothing_to_carry: "Nothing is left to pay on this bill this month, so there is nothing to carry over.",
  ends_before_next_month: "This bill ends before next month, so there is no month to carry it to.",
  note_too_long: `Keep the note to ${BILL_CARRY_OVER_NOTE_MAX_LENGTH} characters or fewer.`,
  carried_again:
    "Next month's bill was carried over again, and that amount includes this one. Undo next month's carry-over first.",
  next_month_carried:
    "Next month's bill is already carried over, so this balance would be lost there. Undo next month's carry-over first.",
  carried_over:
    "This bill was carried over to next month, so its payments for this month are locked. Undo the carry-over to change them.",
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
  carried: "Skipped",
};

/** Which stamp colour each status wears. A failed auto-debit reads as overdue: it still needs paying. */
export const PLANNED_EXPENSE_STAMP_VARIANT: Record<PlannedExpenseStatus, StampVariant> = {
  paid: "paid",
  partial: "partial",
  failed: "overdue",
  overdue: "overdue",
  due: "due",
  scheduled: "scheduled",
  carried: "muted",
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

/**
 * Status colours for the dark month panel on a bill's page. The panel is dark in
 * both themes, so the light theme's inks are too dark for it: these are the
 * dark-theme hues the other panels already use.
 */
export const BILL_PANEL_STATUS_TONE: Record<PlannedExpenseStatus, string> = {
  paid: "text-panel-accent",
  partial: "text-[hsl(213.5_81.1%_68.8%)]",
  failed: "text-[hsl(4.5_69%_72%)]",
  overdue: "text-[hsl(4.5_69%_72%)]",
  due: "text-[hsl(39_67%_62%)]",
  scheduled: "text-panel-muted",
  carried: "text-panel-muted",
};

/** The fill of the month panel's paid meter: green once paid in full, blue while part paid. */
export const BILL_PANEL_METER_FILL = {
  paid: "bg-panel-accent",
  partial: "bg-[hsl(213.5_81.1%_68.8%)]",
} as const;

/** How often a bill repeats, in words. */
export const BILL_PERIOD_LABELS: Record<"monthly" | "quarterly" | "yearly", string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

/** Months of a bill's history listed before "Show all". */
export const BILL_HISTORY_PREVIEW = 12;

/** Months in the run of bars at the top of a bill's history, this month included. */
export const BILL_RECORD_MONTHS = 12;

/** Tallest bar in that run, in px. */
export const BILL_RECORD_BAR_PX = 48;

/** How each month in that run is drawn: the empty tube behind it, and its fill. */
export const BILL_RECORD_STYLE: Record<
  BillRecordStatus,
  { label: string; track: string; fill: string }
> = {
  paid: { label: "Paid in full", track: "bg-primary/10", fill: "bg-primary" },
  partial: { label: "Part paid", track: "bg-info/15", fill: "bg-info" },
  carried: { label: "Carried over", track: "border border-dashed border-hairline-strong bg-muted/40", fill: "" },
  missed: { label: "Nothing paid", track: "border border-destructive/35 bg-destructive/10", fill: "" },
  open: { label: "Not paid yet", track: "border border-dashed border-warning/60 bg-warning/5", fill: "" },
  none: { label: "No bill", track: "bg-muted/50", fill: "" },
};

/** Plain-English text for the errors a payment edit can return; carry-over codes fall back to the map above. */
export const BILL_PAYMENT_EDIT_ERRORS: Record<string, string> = {
  invalid_amount: "Enter an amount above zero.",
  invalid_paid_date: "Pick today or an earlier date.",
  payment_not_found: "This payment is no longer on record. Refresh the page and try again.",
  account_not_found: "That account could not be found. Pick another one.",
};

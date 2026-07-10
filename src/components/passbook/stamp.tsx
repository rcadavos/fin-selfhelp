import { cn } from "@/lib/utils";

/**
 * Passbook status stamp — the PAID / DUE / OVERDUE / SCHEDULED chip.
 * One color vocabulary across the whole product:
 *   paid = accent, due = amber, overdue = red, scheduled/muted = neutral.
 * Styling lives in globals.css (.stamp + .stamp-*) so the spec stays in one place.
 */
export type StampVariant = "paid" | "due" | "overdue" | "scheduled" | "muted";

const VARIANT_CLASS: Record<StampVariant, string> = {
  paid: "stamp-paid",
  due: "stamp-due",
  overdue: "stamp-overdue",
  scheduled: "stamp-sched",
  muted: "stamp-muted",
};

export function Stamp({
  variant = "muted",
  className,
  children,
}: {
  variant?: StampVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("stamp", VARIANT_CLASS[variant], className)}>{children}</span>;
}

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Large-print status chip: an icon plus plain words, so status never rests on
 * colour alone. Same colour vocabulary as the passbook <Stamp> (paid = accent,
 * partial = blue, due = amber, overdue = red, scheduled/muted = neutral-blue/grey),
 * but sized to be read rather than scanned. Use it where the reader may not be
 * comfortable with small, uppercase labels — the dashboard in particular.
 */
export type StatusPillVariant = "paid" | "partial" | "due" | "overdue" | "scheduled" | "muted";

const VARIANT_CLASS: Record<StatusPillVariant, string> = {
  paid: "bg-primary/10 text-primary",
  partial: "bg-info/10 text-info",
  due: "bg-warning/10 text-warning",
  overdue: "bg-destructive/10 text-destructive",
  scheduled: "bg-info/10 text-info",
  muted: "bg-muted text-foreground/80",
};

export function StatusPill({
  variant = "muted",
  icon: Icon,
  className,
  children,
}: {
  variant?: StatusPillVariant;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-semibold leading-snug",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {Icon ? <Icon className="size-[1.1em] shrink-0" aria-hidden /> : null}
      {children}
    </span>
  );
}

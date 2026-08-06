import { cn } from "@/lib/utils";

/**
 * Thin progress meter — the two-div bar this app has always hand-rolled, now in
 * one place (it was duplicated in the goals cards and the receipt scanner).
 *
 * Pass either a ready `value` percentage, or `current` + `target` to have the
 * percentage worked out and clamped for you.
 */
export function Progress({
  value,
  current,
  target,
  size = "sm",
  className,
  barClassName,
  label,
}: {
  value?: number;
  current?: number;
  target?: number;
  size?: "sm" | "md";
  className?: string;
  barClassName?: string;
  /** Accessible description, e.g. "3 of 5 friends joined". */
  label?: string;
}) {
  const raw =
    value ??
    (typeof current === "number" && typeof target === "number" && target > 0
      ? (current / target) * 100
      : 0);
  const pct = Math.max(0, Math.min(100, raw));

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-muted",
        size === "md" ? "h-2" : "h-1.5",
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-all", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

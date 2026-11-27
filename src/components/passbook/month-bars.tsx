import { formatCompactNumber } from "@/lib/shared/number-format";
import { cn } from "@/lib/utils";

/** Tallest bar, in px. */
const BAR_MAX_PX = 56;

export type MonthBar = {
  /** Unique key, such as `YYYY-MM`. */
  key: string;
  /** Short label under the bar, such as "Nov". */
  label: string;
  /** Hover text, such as "November 2026 • ₱12,000". */
  title: string;
  total: number;
};

/**
 * A short run of months as bars on the dark panel, the last one solid and the rest
 * faded, each with its compact figure above. For a panel that wants "how does this
 * month sit against the ones before it" without a chart library.
 */
export function MonthBars({
  months,
  label,
  className,
}: {
  months: MonthBar[];
  /** Accessible description of the whole run, since the bars themselves are hidden. */
  label: string;
  className?: string;
}) {
  const max = months.reduce((m, t) => Math.max(m, t.total), 0);

  return (
    <div role="img" aria-label={label} className={cn("flex items-end gap-1.5 sm:gap-2", className)}>
      {months.map((t, i) => {
        const selected = i === months.length - 1;
        const height = max > 0 && t.total > 0 ? Math.max(4, Math.round((t.total / max) * BAR_MAX_PX)) : 2;
        return (
          <div
            key={t.key}
            title={t.title}
            className="flex h-[88px] flex-1 flex-col items-center justify-end gap-1 sm:w-10 sm:flex-none"
          >
            <span
              className={cn(
                "min-h-[10px] whitespace-nowrap font-mono text-[9.5px] leading-none",
                selected ? "text-panel-foreground" : "text-panel-muted",
              )}
            >
              {t.total > 0 ? formatCompactNumber(t.total) : ""}
            </span>
            <span
              className={cn(
                "block w-full max-w-[22px] rounded-b-[1px] rounded-t-[4px] transition-[height] duration-500",
                t.total > 0 ? (selected ? "bg-panel-accent" : "bg-panel-accent/40") : "bg-panel-foreground/20",
              )}
              style={{ height }}
            />
            <span
              className={cn(
                "font-mono text-[10px] leading-none",
                selected ? "font-semibold text-panel-foreground" : "text-panel-muted",
              )}
            >
              {t.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

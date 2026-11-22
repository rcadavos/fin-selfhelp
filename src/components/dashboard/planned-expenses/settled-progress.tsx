import { cn } from "@/lib/utils";
import type { PlannedExpenseSummary } from "@/lib/planned-expenses/grouping";

/**
 * The month's settled meter: fully paid in green, part payments in blue after it,
 * then "n of m settled". Shared by the runway, the calendar and the summary cards
 * so the three can never draw the same month differently.
 */
export function SettledProgress({
  summary,
  className,
}: {
  summary: PlannedExpenseSummary;
  className?: string;
}) {
  const settledPct = summary.total > 0 ? (summary.settledAmount - summary.partialAmount) / summary.total : 0;
  const partialPct = summary.total > 0 ? summary.partialAmount / summary.total : 0;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-[5px] flex-1 overflow-hidden rounded-full bg-muted">
        <i className="h-full bg-primary transition-[width] duration-500" style={{ width: `${settledPct * 100}%` }} />
        <i className="h-full bg-info/75 transition-[width] duration-500" style={{ width: `${partialPct * 100}%` }} />
      </div>
      <span className="whitespace-nowrap font-mono text-[10.5px] text-muted-foreground">
        {summary.settledCount} of {summary.totalCount} settled
      </span>
    </div>
  );
}

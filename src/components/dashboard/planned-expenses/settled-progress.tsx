import { cn } from "@/lib/utils";
import type { PlannedExpenseSummary } from "@/lib/planned-expenses/grouping";

/**
 * "30% paid": the share of the month's money paid so far, part payments included.
 * Rounded down, so it never reads 100% while something is still owed, and "<1%"
 * when a sliver is paid, so the label never says 0% beside a visible bar.
 */
function paidShareLabel(summary: PlannedExpenseSummary): string {
  if (summary.total <= 0) return "Nothing due";
  if (summary.remaining <= 0) return "100% paid";
  const pct = Math.floor((summary.settledAmount / summary.total) * 100);
  return summary.settledAmount > 0 && pct < 1 ? "<1% paid" : `${pct}% paid`;
}

/**
 * The month's settled meter: fully paid in green, part payments in blue after it,
 * then the share paid. Bar and label both measure money, not bill count, so a
 * month of small paid bills and one big open one reads as mostly unpaid in both
 * places. Shared by the runway, the calendar and the summary cards so the three
 * can never draw the same month differently.
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
        {paidShareLabel(summary)}
      </span>
    </div>
  );
}

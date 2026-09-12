"use client";

import { Amount } from "@/components/passbook/amount";
import { cn, formatCurrency } from "@/lib/utils";
import { RUNWAY_MARKER_BREAKPOINTS } from "@/lib/constants/planned-expenses";
import type {
  PlannedExpenseRow,
  PlannedExpenseStatus,
  PlannedExpenseSummary,
} from "@/lib/planned-expenses/grouping";

/**
 * The month as a due-date runway.
 *
 * The question this page has to answer is *timing* — what lands when, and is it
 * behind. A category pie answers a year-end question instead, which is why it used
 * to occupy the most valuable space on the page while being collapsed by default.
 */

const MARKER_TONE: Record<PlannedExpenseStatus, string> = {
  overdue: "bg-destructive",
  failed: "border-[1.5px] border-destructive bg-destructive/20",
  partial: "border-[1.5px] border-warning bg-warning/50",
  due: "bg-warning",
  scheduled: "border-[1.5px] border-hairline-strong bg-card",
  paid: "border-[1.5px] border-primary/55 bg-primary/25",
};

function markerSize(amount: number, largest: number): string {
  if (largest <= 0) return "size-3";
  const share = amount / largest;
  if (share < RUNWAY_MARKER_BREAKPOINTS.small) return "size-2";
  if (share < RUNWAY_MARKER_BREAKPOINTS.medium) return "size-3";
  return "size-4";
}

export function Runway({
  rows,
  summary,
  currency,
  monthLabel,
  daysInMonth,
  todayDay,
}: {
  rows: PlannedExpenseRow[];
  summary: PlannedExpenseSummary;
  currency: string;
  monthLabel: string;
  daysInMonth: number;
  /** Day-of-month for the "today" marker, or null when viewing another month. */
  todayDay: number | null;
}) {
  const largest = rows.reduce((max, r) => Math.max(max, r.bill.amount), 0);
  const span = Math.max(1, daysInMonth - 1);
  const positioned = rows.filter((r) => r.due !== null);
  const ticks = [1, 8, 15, 22, daysInMonth];

  const settledPct = summary.total > 0 ? (summary.settledAmount - summary.partialAmount) / summary.total : 0;
  const partialPct = summary.total > 0 ? summary.partialAmount / summary.total : 0;

  return (
    <div className="surface border border-border bg-card p-4 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="fit-figure min-w-0">
          <Amount value={summary.remaining} currency={currency} className="text-2xl font-semibold tracking-tight" />
          <p className="text-[11.5px] text-muted-foreground">still to pay in {monthLabel}</p>
        </div>
        <div className="fit-figure min-w-0 text-right">
          <Amount value={summary.settledAmount} currency={currency} className="text-[12.5px]" />
          <p className="text-[11.5px] text-muted-foreground">
            settled of {formatCurrency(summary.total, currency)}
          </p>
        </div>
      </div>

      {positioned.length > 0 && (
        <div className="relative mt-5 h-[66px]" aria-hidden>
          <div className="absolute inset-x-0 top-[38px] border-t border-hairline-strong" />

          {ticks.map((day) => (
            <div
              key={day}
              className="absolute top-[38px] -translate-x-1/2 text-center"
              style={{ left: `${((day - 1) / span) * 100}%` }}
            >
              <i className="mx-auto block h-[5px] w-px bg-hairline-strong" />
              <span className="mt-1 block font-mono text-[9.5px] text-muted-foreground">{day}</span>
            </div>
          ))}

          {todayDay !== null && (
            <div
              className="absolute bottom-5 top-1.5 w-px -translate-x-1/2 bg-primary"
              style={{ left: `${((todayDay - 1) / span) * 100}%` }}
            >
              <span className="absolute -top-1 left-1.5 whitespace-nowrap font-mono text-[8.5px] tracking-[0.09em] text-primary">
                TODAY
              </span>
            </div>
          )}

          {positioned.map((row) => (
            <span
              key={row.bill.id}
              title={`${row.bill.note ?? ""} · ${row.due?.getDate()} ${monthLabel}`}
              className={cn(
                "absolute top-[38px] -translate-x-1/2 -translate-y-1/2 rounded-full",
                markerSize(row.bill.amount, largest),
                MARKER_TONE[row.status],
              )}
              style={{ left: `${(((row.due?.getDate() ?? 1) - 1) / span) * 100}%` }}
            />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2.5">
        <div className="flex h-[5px] flex-1 overflow-hidden rounded-full bg-muted">
          <i className="h-full bg-primary transition-[width] duration-500" style={{ width: `${settledPct * 100}%` }} />
          <i className="h-full bg-warning/75 transition-[width] duration-500" style={{ width: `${partialPct * 100}%` }} />
        </div>
        <span className="whitespace-nowrap font-mono text-[10.5px] text-muted-foreground">
          {summary.settledCount} of {summary.totalCount} settled
        </span>
      </div>
    </div>
  );
}

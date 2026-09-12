"use client";

import { Amount } from "@/components/passbook/amount";
import { cn } from "@/lib/utils";
import type { PlannedExpenseRow, PlannedExpenseStatus, PlannedExpenseSummary } from "@/lib/planned-expenses/grouping";

/** The whole month at a glance — one dot per bill, coloured by what it needs. */

const DOT_TONE: Record<PlannedExpenseStatus, string> = {
  overdue: "bg-destructive",
  failed: "bg-destructive",
  partial: "bg-warning",
  due: "bg-warning",
  scheduled: "bg-hairline-strong",
  paid: "bg-primary/50",
};

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export function MonthCalendar({
  rows,
  summary,
  currency,
  monthLabel,
  year,
  month0,
  todayDay,
}: {
  rows: PlannedExpenseRow[];
  summary: PlannedExpenseSummary;
  currency: string;
  monthLabel: string;
  year: number;
  /** Zero-based month, as JS Date uses. */
  month0: number;
  todayDay: number | null;
}) {
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const leadingBlanks = new Date(year, month0, 1).getDay();

  const byDay = new Map<number, PlannedExpenseRow[]>();
  for (const row of rows) {
    if (!row.due) continue;
    const day = row.due.getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), row]);
  }

  const settledPct = summary.total > 0 ? (summary.settledAmount - summary.partialAmount) / summary.total : 0;
  const partialPct = summary.total > 0 ? summary.partialAmount / summary.total : 0;

  return (
    <div className="surface overflow-hidden border border-border bg-card shadow-[var(--shadow)]">
      <div className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {monthLabel}
        </span>
        <span className="fit-figure min-w-0 text-[12.5px]">
          <Amount value={summary.remaining} currency={currency} />
          <span className="ml-1 text-[11px] text-muted-foreground">left</span>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-0.5 px-2.5 pb-2.5" role="grid" aria-label={`${monthLabel} planned expenses`}>
        {DOW.map((d, i) => (
          <span
            key={`${d}-${i}`}
            className="pb-1 pt-0.5 text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </span>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <span key={`blank-${i}`} className="invisible aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayRows = byDay.get(day) ?? [];
          const isToday = todayDay === day;
          const isPast = todayDay !== null && day < todayDay;
          return (
            <span
              key={day}
              title={dayRows.length ? dayRows.map((r) => r.bill.note ?? "Planned expense").join(", ") : undefined}
              className={cn(
                "flex aspect-square min-h-[30px] flex-col items-center justify-center gap-0.5 rounded border border-transparent font-mono text-[11px]",
                isToday && "border-primary font-semibold text-primary",
                isPast && !isToday && "opacity-55",
                dayRows.length > 0 && !isToday && "bg-accent/40",
              )}
            >
              {day}
              <span className="flex h-[5px] items-center gap-px">
                {dayRows.slice(0, 3).map((row) => (
                  <i key={row.bill.id} className={cn("block size-1 rounded-full", DOT_TONE[row.status])} />
                ))}
              </span>
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 border-t border-border px-3.5 py-2.5">
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

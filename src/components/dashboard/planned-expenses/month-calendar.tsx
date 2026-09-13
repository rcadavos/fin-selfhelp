"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { Stamp, type StampVariant } from "@/components/passbook/stamp";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

const STATUS_LABEL: Record<PlannedExpenseStatus, string> = {
  overdue: "Overdue",
  failed: "Failed",
  partial: "Part paid",
  due: "Due",
  scheduled: "Scheduled",
  paid: "Paid",
};

/**
 * A day's own state, from the bills falling on it — the most urgent one wins, so
 * a day holding one overdue bill and two settled ones still reads as overdue.
 * "All paid" is the exception worth showing positively rather than as an absence.
 */
type DayStatus = "paid" | "overdue" | "partial" | "due" | "scheduled";

function dayStatusFor(rows: PlannedExpenseRow[]): DayStatus {
  if (rows.every((r) => r.status === "paid")) return "paid";
  if (rows.some((r) => r.status === "overdue" || r.status === "failed")) return "overdue";
  if (rows.some((r) => r.status === "partial")) return "partial";
  if (rows.some((r) => r.status === "due")) return "due";
  return "scheduled";
}

const DAY_TONE: Record<DayStatus, string> = {
  paid: "border-primary/30 bg-primary/15 text-primary",
  overdue: "border-destructive/30 bg-destructive/15 text-destructive",
  partial: "border-warning/30 bg-warning/15 text-warning",
  due: "border-warning/25 bg-warning/10 text-warning",
  scheduled: "border-border bg-muted text-foreground",
};

const STATUS_STAMP: Record<PlannedExpenseStatus, StampVariant> = {
  overdue: "overdue",
  failed: "overdue",
  partial: "due",
  due: "due",
  scheduled: "scheduled",
  paid: "paid",
};

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
  const [openDay, setOpenDay] = useState<number | null>(null);
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

      <div className="grid grid-cols-7 gap-0.5 px-2.5 pb-2.5" role="grid" aria-label={`${monthLabel} bills`}>
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
          const status = dayRows.length > 0 ? dayStatusFor(dayRows) : null;
          const cellClass = cn(
            // rounded-lg, not the surface token: these are ~40px squares, and the
            // card radius reads as a blob at that size.
            "flex aspect-square min-h-[30px] w-full flex-col items-center justify-center gap-0.5 rounded-lg border font-mono text-[11px]",
            status ? DAY_TONE[status] : "border-transparent",
            // Only dim empty past days — a settled day has earned its colour.
            !status && isPast && "opacity-55",
            // A ring rather than a border, so today reads on top of a status colour
            // instead of overwriting its border.
            isToday && "font-semibold ring-1 ring-primary",
          );
          const cellInner = (
            <>
              {day}
              <span className="flex h-3 items-center justify-center gap-px">
                {status === "paid" ? (
                  <Check className="size-3 text-primary" strokeWidth={3} aria-hidden />
                ) : (
                  dayRows.slice(0, 3).map((row) => (
                    <i key={row.bill.id} className={cn("block size-1 rounded-full", DOT_TONE[row.status])} />
                  ))
                )}
              </span>
            </>
          );

          if (dayRows.length === 0) {
            return (
              <span key={day} className={cellClass}>
                {cellInner}
              </span>
            );
          }

          // Radix Popover rather than a title tooltip or a hover-only panel: it
          // collision-flips near the grid edges, and opening on click as well as
          // hover means this works on a phone, where this calendar mostly lives.
          return (
            <Popover key={day} open={openDay === day} onOpenChange={(o) => setOpenDay(o ? day : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onMouseEnter={() => setOpenDay(day)}
                  onMouseLeave={() => setOpenDay((d) => (d === day ? null : d))}
                  aria-label={`${dayRows.length} bill${dayRows.length === 1 ? "" : "s"} due ${monthLabel} ${day}`}
                  className={cn(
                    cellClass,
                    "cursor-pointer transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  {cellInner}
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" sideOffset={6} className="w-56 overflow-hidden p-0">
                <p className="border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {monthLabel} {day}
                </p>
                <ul className="divide-y divide-border">
                  {dayRows.map((row) => (
                    <li key={row.bill.id} className="flex items-start justify-between gap-2 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium">
                          {row.bill.note ?? "Bill"}
                        </span>
                        <Stamp variant={STATUS_STAMP[row.status]} className="mt-1">
                          {STATUS_LABEL[row.status]}
                        </Stamp>
                      </span>
                      <Amount
                        value={row.outstanding > 0 ? row.outstanding : row.bill.amount}
                        currency={currency}
                        className="shrink-0 text-[13px]"
                      />
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
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

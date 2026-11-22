"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayBillsList } from "@/components/dashboard/planned-expenses/day-bills-list";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/shared/number-format";
import {
  DAY_RUNWAY_BAR_PX,
  DAY_STATUS_FILL,
  DAY_STATUS_LEGEND,
} from "@/lib/constants/planned-expenses";
import { dayStatusFor, rowsByDueDay, type PlannedExpenseRow } from "@/lib/planned-expenses/grouping";

/**
 * The month one day at a time, for screens wide enough to give every day its own
 * column. Bar height is what falls due that day, colour is the day's most urgent
 * status, so a heavy week and a late bill both read before you open the list.
 * On a phone the dot runway or the calendar does this job instead.
 */
export function DayRunway({
  rows,
  currency,
  monthLabel,
  year,
  month0,
  todayDay,
  className,
}: {
  rows: PlannedExpenseRow[];
  currency: string;
  monthLabel: string;
  year: number;
  /** Zero-based month, as JS Date uses. */
  month0: number;
  /** Day-of-month for the "today" marker, or null when viewing another month. */
  todayDay: number | null;
  className?: string;
}) {
  const [openDay, setOpenDay] = useState<number | null>(null);
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const byDay = rowsByDueDay(rows);
  const dayTotal = (day: number) => (byDay.get(day) ?? []).reduce((sum, r) => sum + r.bill.amount, 0);
  let heaviest = 0;
  for (let day = 1; day <= daysInMonth; day++) heaviest = Math.max(heaviest, dayTotal(day));

  return (
    <section
      aria-label={`${monthLabel} bills by due day`}
      className={cn("surface border border-border bg-card px-4 pb-3 pt-4 shadow-[var(--shadow)]", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <h2 className="text-sm font-semibold">{monthLabel}, day by day</h2>
        <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-muted-foreground">
          {DAY_STATUS_LEGEND.map(({ status, label }) => (
            <li key={status} className="inline-flex items-center gap-1.5">
              <i className={cn("block size-2.5 rounded-[3px]", DAY_STATUS_FILL[status])} aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="mt-3 grid items-end gap-0.5"
        style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayRows = byDay.get(day) ?? [];
          const total = dayTotal(day);
          const isToday = todayDay === day;
          const isPast = todayDay !== null && day < todayDay;
          const weekday = new Date(year, month0, day).getDay();
          const isWeekend = weekday === 0 || weekday === 6;
          const status = dayRows.length > 0 ? dayStatusFor(dayRows) : null;
          const barHeight =
            heaviest > 0 && total > 0
              ? Math.round(DAY_RUNWAY_BAR_PX.min + (DAY_RUNWAY_BAR_PX.max - DAY_RUNWAY_BAR_PX.min) * (total / heaviest))
              : 0;

          const column = (
            <>
              {isToday && (
                <>
                  <span className="absolute bottom-[22px] left-1/2 top-3 w-px -translate-x-1/2 bg-primary" aria-hidden />
                  <span className="absolute left-1/2 top-0 ml-1 whitespace-nowrap bg-card px-0.5 font-mono text-[8.5px] tracking-[0.09em] text-primary">
                    TODAY
                  </span>
                </>
              )}
              {status && (
                <>
                  <span
                    className={cn(
                      "mb-[3px] whitespace-nowrap font-mono text-[9px]",
                      status === "paid" ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {formatCompactNumber(total)}
                  </span>
                  <span
                    className={cn("relative block w-3/5 max-w-[18px] rounded-t-[3px] rounded-b-[1px]", DAY_STATUS_FILL[status])}
                    style={{ height: barHeight }}
                  />
                </>
              )}
              {!status && <span className="block h-0.5 w-3/5 max-w-[18px] rounded-full bg-border" />}
              <span
                className={cn(
                  "h-[18px] font-mono text-[10px] leading-[18px]",
                  isToday ? "font-semibold text-primary" : isPast ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {day}
              </span>
            </>
          );

          const columnClass = cn(
            "relative flex h-[118px] w-full flex-col items-center justify-end rounded-md",
            isWeekend && "bg-background",
          );

          if (dayRows.length === 0) {
            return (
              <div key={day} className={columnClass} aria-hidden>
                {column}
              </div>
            );
          }

          // Same Popover pattern as the month calendar: it opens on hover and on
          // click, so a keyboard or touch user gets the day's bills as well.
          return (
            <Popover key={day} open={openDay === day} onOpenChange={(o) => setOpenDay(o ? day : null)}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onMouseEnter={() => setOpenDay(day)}
                  onMouseLeave={() => setOpenDay((d) => (d === day ? null : d))}
                  aria-label={`${dayRows.length} bill${dayRows.length === 1 ? "" : "s"} due ${monthLabel} ${day}`}
                  className={cn(
                    columnClass,
                    "cursor-pointer transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  {column}
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" sideOffset={6} className="w-56 overflow-hidden p-0">
                <DayBillsList heading={`${monthLabel} ${day}`} rows={dayRows} currency={currency} />
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </section>
  );
}

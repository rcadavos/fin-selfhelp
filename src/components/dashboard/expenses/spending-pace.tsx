"use client";

import type { ReactNode } from "react";
import { Amount } from "@/components/passbook/amount";
import { CountUpAmount } from "@/components/passbook/count-up-amount";
import { Stamp } from "@/components/passbook/stamp";
import { SpendingBurnUp } from "@/components/dashboard/expenses/spending-burn-up";
import { paidMonthName } from "@/lib/paid-month";
import { cn, roundToCents } from "@/lib/utils";
import type { CumulativeSpendPoint, SpendingPace } from "@/lib/expenses/pace";

/** Amber that reads on the dark green panel in both themes, for a month running hot. */
const OVER_TEXT = "text-[hsl(39_67%_62%)]";
const OVER_FILL = "bg-[hsl(39_67%_62%)]";

function PaceStat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fit-figure flex min-w-0 flex-col gap-1">
      <dt className="font-mono text-[9.5px] uppercase tracking-[0.07em] text-panel-muted sm:text-[10.5px] sm:tracking-[0.08em]">
        {label}
      </dt>
      <dd className="m-0 text-[13px] sm:text-[15px]">{children}</dd>
    </div>
  );
}

/**
 * The month with a pace attached.
 *
 * What you have spent, whether that is more than usual, and where the month is
 * heading. The bar puts how much of the month has gone against how much of a
 * usual month you have spent, and the chart beside it draws the same comparison
 * day by day, so running hot is visible at a glance rather than arithmetic you do
 * yourself. Compares against your own completed months, so it needs no budget.
 */
export function SpendingPacePanel({
  pace,
  series,
  monthYm,
  currency,
  isCurrentMonth,
}: {
  pace: SpendingPace;
  /** The month's running total, day by day, for the chart. */
  series: CumulativeSpendPoint[];
  monthYm: string;
  currency: string;
  isCurrentMonth: boolean;
}) {
  const {
    spent,
    entryCount,
    projected,
    usualMonth,
    deltaPct,
    spentRatio,
    elapsedRatio,
    dailyAverage,
    dayOfMonth,
    daysInMonth,
  } = pace;
  // Ahead of pace = a larger share of a usual month spent than of the month elapsed.
  const isOver = spentRatio !== null && spentRatio > elapsedRatio;
  const fillPct = Math.min(100, (spentRatio ?? elapsedRatio) * 100);
  const gap = usualMonth !== null ? roundToCents(usualMonth - spent) : null;
  const monthShort = paidMonthName(monthYm, "short");
  const monthLong = paidMonthName(monthYm, "long");

  return (
    <section
      aria-label={`${monthLong} spending pace`}
      className="relative overflow-hidden rounded-[var(--surface-radius,0.875rem)] bg-panel p-5 text-panel-foreground shadow-[var(--shadow)] after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(hsl(var(--panel-accent)/0.055)_0_1px,transparent_1px_26px)] sm:p-7"
    >
      <div className="relative z-10 grid gap-7 md:grid-cols-2 md:gap-10">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="fit-figure min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-panel-accent">
                {isCurrentMonth ? "Spent so far" : "Spent"}
              </p>
              {/* On a computer the day count sits beside the month picker instead. */}
              {isCurrentMonth && (
                <p className="font-mono text-[11px] text-panel-muted sm:hidden">
                  Day {dayOfMonth} of {daysInMonth}
                </p>
              )}
            </div>
            <CountUpAmount
              value={spent}
              currency={currency}
              className="mt-1 block text-[36px] leading-tight tracking-tight sm:text-[44px]"
            />
            {deltaPct !== null && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-panel-muted">
                <Stamp
                  variant={deltaPct > 0 ? "due" : "paid"}
                  className={cn("border-current", deltaPct > 0 ? OVER_TEXT : "text-panel-accent")}
                >
                  {Math.abs(Math.round(deltaPct))}% {deltaPct > 0 ? "over" : "under"} usual
                </Stamp>
                {isCurrentMonth && (
                  <span>
                    on pace for <Amount value={projected} currency={currency} className="text-panel-foreground" /> by{" "}
                    {daysInMonth} {monthShort}
                  </span>
                )}
              </p>
            )}
          </div>

          {usualMonth !== null ? (
            <div>
              <div className="relative h-2 rounded-full bg-panel-foreground/15">
                <i
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-500",
                    isOver ? OVER_FILL : "bg-panel-accent",
                  )}
                  style={{ width: `${fillPct}%` }}
                />
                {/* Where the month actually is, so the fill either leads it or trails it. */}
                <i
                  aria-hidden
                  className="absolute -top-[5px] h-[18px] w-0.5 -translate-x-1/2 rounded-full bg-panel-foreground"
                  style={{ left: `${Math.min(100, elapsedRatio * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-xs text-panel-muted">
                <span>
                  {isCurrentMonth ? (
                    <>
                      Month <b className="font-semibold text-panel-foreground">{Math.round(elapsedRatio * 100)}%</b> gone
                    </>
                  ) : (
                    "The whole month"
                  )}
                </span>
                <span>
                  <b className="font-semibold text-panel-foreground">{Math.round((spentRatio ?? 0) * 100)}%</b> of a
                  usual month spent
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-panel-muted">
              {entryCount > 0
                ? "A month or two of history unlocks the comparison with a usual month."
                : "Nothing logged this month yet."}
            </p>
          )}

          <dl className="m-0 grid grid-cols-3 gap-3 border-t border-panel-foreground/15 pt-4">
            {usualMonth !== null && gap !== null ? (
              <>
                <PaceStat label="Usual month">
                  <Amount value={usualMonth} currency={currency} />
                </PaceStat>
                <PaceStat label={gap < 0 ? "Over usual" : isCurrentMonth ? "Left of usual" : "Under usual"}>
                  <Amount
                    value={Math.abs(gap)}
                    currency={currency}
                    className={cn((gap < 0 || (isCurrentMonth && isOver)) && OVER_TEXT)}
                  />
                </PaceStat>
              </>
            ) : (
              <PaceStat label="Entries">
                <span className="figure">{entryCount}</span>
              </PaceStat>
            )}
            <PaceStat label="Daily average">
              <Amount value={dailyAverage} currency={currency} />
            </PaceStat>
          </dl>
        </div>

        <SpendingBurnUp
          caption={isCurrentMonth ? `${monthLong} so far` : monthLong}
          series={series}
          daysInMonth={daysInMonth}
          usualMonth={usualMonth}
          projected={isCurrentMonth && usualMonth !== null ? projected : null}
          monthShort={monthShort}
          currency={currency}
        />
      </div>
    </section>
  );
}

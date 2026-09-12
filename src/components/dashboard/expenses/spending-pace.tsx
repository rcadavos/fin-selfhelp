"use client";

import { Amount } from "@/components/passbook/amount";
import { Stamp } from "@/components/passbook/stamp";
import { cn, formatCurrency } from "@/lib/utils";
import type { SpendingPace } from "@/lib/expenses/pace";

/**
 * The month with a pace attached.
 *
 * Replaces two bare totals ("today", "this month") that told you what you spent
 * and never whether it was a lot. The bar puts how much of the month has elapsed
 * against how much of a usual month you have spent, so running hot is visible at
 * a glance rather than arithmetic you do yourself.
 */
export function SpendingPacePanel({
  pace,
  currency,
  isCurrentMonth,
}: {
  pace: SpendingPace;
  currency: string;
  isCurrentMonth: boolean;
}) {
  const { spent, projected, usualMonth, deltaPct, spentRatio, elapsedRatio } = pace;
  // Ahead of pace = a larger share of a usual month spent than of the month elapsed.
  const isOver = spentRatio !== null && spentRatio > elapsedRatio;
  const fillPct = Math.min(100, (spentRatio ?? elapsedRatio) * 100);

  return (
    <div className="relative overflow-hidden rounded-[var(--surface-radius,0.875rem)] bg-panel p-4 text-panel-foreground shadow-[var(--shadow)] after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(hsl(var(--panel-accent)/0.055)_0_1px,transparent_1px_26px)]">
      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="fit-figure min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-panel-muted">
              {isCurrentMonth ? "Spent so far" : "Spent"}
            </p>
            <Amount
              value={spent}
              currency={currency}
              className="mt-0.5 block text-[32px] font-semibold tracking-tight"
            />
          </div>

          {/* A projection only means something while the month is still running. */}
          {isCurrentMonth && usualMonth !== null && (
            <div className="fit-figure min-w-0 text-right">
              <Amount value={projected} currency={currency} className="text-sm" />
              <p className="mt-1 text-[11.5px] text-panel-muted">
                projected
                {deltaPct !== null && (
                  <>
                    {" · "}
                    <Stamp
                      variant={deltaPct > 0 ? "due" : "paid"}
                      className={cn(
                        "ml-0.5 border-current",
                        deltaPct > 0 ? "text-[hsl(39_67%_62%)]" : "text-panel-accent",
                      )}
                    >
                      {Math.abs(Math.round(deltaPct))}% {deltaPct > 0 ? "over" : "under"} usual
                    </Stamp>
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {usualMonth !== null ? (
          <div className="mt-3.5">
            <div className="relative h-2 overflow-hidden rounded-full bg-panel-foreground/15">
              <i
                className={cn(
                  "block h-full rounded-full transition-[width] duration-500",
                  isOver ? "bg-[hsl(39_67%_62%)]" : "bg-panel-accent",
                )}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            {/* Where the month actually is, so the fill either leads it or trails it. */}
            <div className="relative">
              <i
                aria-hidden
                className="absolute -top-3.5 h-3.5 w-0.5 rounded-full bg-panel-foreground/75"
                style={{ left: `${Math.min(100, elapsedRatio * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-panel-muted">
              <span>
                Day <b className="font-medium text-panel-foreground">{pace.dayOfMonth}</b> of{" "}
                {pace.daysInMonth}
              </span>
              <span>
                <b className="font-medium text-panel-foreground">
                  {Math.round((spentRatio ?? 0) * 100)}%
                </b>{" "}
                of a usual month
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11.5px] text-panel-muted">
            {pace.entryCount > 0
              ? `${pace.entryCount} ${pace.entryCount === 1 ? "entry" : "entries"} · a month or two of history unlocks the pace comparison`
              : "Nothing logged this month yet."}
          </p>
        )}

        {isCurrentMonth && usualMonth !== null && (
          <p className="sr-only">
            Usual month {formatCurrency(usualMonth, currency)}.
          </p>
        )}
      </div>
    </div>
  );
}

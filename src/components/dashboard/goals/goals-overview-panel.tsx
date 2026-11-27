"use client";

import { PartyPopper, TrendingUp } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { CountUpAmount } from "@/components/passbook/count-up-amount";
import { MonthBars } from "@/components/passbook/month-bars";
import { cn, formatCurrency } from "@/lib/utils";
import { ymLabel, ymMonthName, type GoalsOverview } from "@/lib/goals/progress";
import { GOAL_TREND_MONTHS } from "@/lib/constants/goals";

const LEDGER_RULE =
  "after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(hsl(var(--panel-accent)/0.055)_0_1px,transparent_1px_26px)]";

/**
 * Every goal at once, on the dark panel: what is saved toward the goals still in
 * progress, how far that is toward their targets, and the last few months of
 * saving — so a month with nothing put aside shows up as a gap rather than
 * staying invisible until a goal slips.
 */
export function GoalsOverviewPanel({
  overview,
  currency,
  currentYm,
}: {
  overview: GoalsOverview;
  currency: string;
  /** The viewer's month (`YYYY-MM`), or null while the page hydrates. */
  currentYm: string | null;
}) {
  const { activeCount, reachedCount, savedInProgress, targetTotal, savedTowardTargets, targetRatio } = overview;
  const allReached = activeCount === 0 && reachedCount > 0;
  const pct = targetRatio !== null ? Math.floor(targetRatio * 100) : null;
  const toGo = Math.max(0, targetTotal - savedTowardTargets);

  return (
    <section
      aria-label="Your goals at a glance"
      className={cn("surface relative overflow-hidden bg-panel p-4 text-panel-foreground shadow-[var(--shadow)] sm:p-5", LEDGER_RULE)}
    >
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="fit-figure min-w-0">
          {allReached ? (
            <>
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.11em] text-panel-accent">
                <PartyPopper className="size-3" aria-hidden />
                Every goal reached
              </p>
              <p className="mt-2 text-[22px] font-semibold leading-tight tracking-tight">Time for a new one?</p>
              <p className="mt-1.5 text-[12.5px] text-panel-muted">
                You have reached all {reachedCount} of your goals. Add another to keep the momentum going.
              </p>
            </>
          ) : (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-panel-muted">
                Saved toward {activeCount} {activeCount === 1 ? "goal" : "goals"}
              </p>
              <CountUpAmount
                value={savedInProgress}
                currency={currency}
                className="mt-1 block text-[32px] font-semibold leading-tight tracking-tight"
              />
              {overview.addedThisMonth !== null && currentYm && (
                <p
                  className={cn(
                    "mt-1.5 flex items-start gap-1.5 text-[12.5px]",
                    overview.addedThisMonth > 0 ? "text-panel-accent" : "text-panel-muted",
                  )}
                >
                  <TrendingUp className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>
                    {overview.addedThisMonth > 0
                      ? `${formatCurrency(overview.addedThisMonth, currency)} added in ${ymMonthName(currentYm, "long")}`
                      : `Nothing added yet in ${ymMonthName(currentYm, "long")}`}
                  </span>
                </p>
              )}
            </>
          )}
        </div>

        {overview.trend ? (
          <MonthBars
            label={`Saved in the last ${GOAL_TREND_MONTHS} months. ${overview.trend
              .map((t) => `${ymLabel(t.month, "long")}: ${formatCurrency(t.total, currency)}`)
              .join(", ")}`}
            months={overview.trend.map((t) => ({
              key: t.month,
              label: ymMonthName(t.month),
              title: `${ymLabel(t.month, "long")} • ${formatCurrency(t.total, currency)}`,
              total: t.total,
            }))}
          />
        ) : (
          // Holds the bars' height until the viewer's month is known.
          <div aria-hidden className="h-[88px] sm:w-[17.5rem]" />
        )}
      </div>

      {!allReached && pct !== null && (
        <div className="relative z-10 mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-panel-foreground/15">
            <i
              className="block h-full rounded-full bg-panel-accent transition-[width] duration-500"
              style={{ width: `${Math.min(100, (targetRatio ?? 0) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-[11.5px] text-panel-muted">
            <span>
              <b className="font-medium text-panel-foreground">
                {savedTowardTargets > 0 && pct < 1 ? "<1" : pct}%
              </b>{" "}
              of <Amount value={targetTotal} currency={currency} className="text-panel-foreground" /> in targets
            </span>
            {toGo > 0 && (
              <span>
                <Amount value={toGo} currency={currency} className="text-panel-foreground" /> to go
              </span>
            )}
          </div>
        </div>
      )}

      <p className="relative z-10 mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-panel-foreground/15 pt-3 text-[11.5px] text-panel-muted">
        <span>{activeCount} in progress</span>
        <span aria-hidden>•</span>
        <span>{reachedCount} reached</span>
        {overview.averageMonth !== null && overview.averageMonth > 0 && (
          <>
            <span aria-hidden>•</span>
            <span>
              Usually about{" "}
              <Amount value={Math.round(overview.averageMonth)} currency={currency} className="text-panel-foreground" /> a
              month
            </span>
          </>
        )}
      </p>
    </section>
  );
}

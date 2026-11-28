"use client";

import { ArrowDownRight, ArrowUpRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/passbook/amount";
import { CountUpAmount } from "@/components/passbook/count-up-amount";
import {
  NetBalanceTrend,
  shortDayLabel,
  type NetBalancePoint,
} from "@/components/dashboard/accounts/net-balance-trend";
import { AMOUNT_MASK } from "@/lib/constants/dashboard";
import { cn, roundToCents } from "@/lib/utils";

/**
 * The headline: the Net Balance, how far it has moved since the first day of the
 * chart, how many accounts it counts, and the line of those days underneath.
 */
export function NetBalanceCard({
  netBalance,
  series,
  accountCount,
  trackedCount,
  amountsHidden,
  onToggleAmountsHidden,
}: {
  netBalance: number;
  /** Daily Net Balance, oldest first, ending today. */
  series: NetBalancePoint[];
  accountCount: number;
  /** Accounts counted in the Net Balance. */
  trackedCount: number;
  amountsHidden: boolean;
  onToggleAmountsHidden: () => void;
}) {
  const first = series[0];
  const last = series[series.length - 1];
  const change = series.length > 1 ? roundToCents(last.balance - first.balance) : null;

  return (
    <section
      aria-labelledby="accounts-net-balance"
      className="surface flex min-w-0 flex-col border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="accounts-net-balance" className="text-[13px] font-semibold text-muted-foreground">
          Net balance
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="tap-target -my-1.5 -mr-1.5 text-muted-foreground hover:text-foreground"
          onClick={onToggleAmountsHidden}
          aria-label={amountsHidden ? "Show amounts" : "Hide amounts"}
        >
          {amountsHidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </Button>
      </div>

      <div className="fit-figure mt-1">
        {amountsHidden ? (
          <p className="figure text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]">{AMOUNT_MASK}</p>
        ) : (
          <CountUpAmount
            value={netBalance}
            className={cn(
              "text-[32px] font-semibold leading-tight tracking-tight sm:text-[40px]",
              netBalance < 0 && "text-destructive",
            )}
          />
        )}
      </div>

      {change !== null && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-muted-foreground">
          {change === 0 ? (
            <span>No change</span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                change > 0 ? "text-primary" : "text-destructive",
              )}
            >
              {change > 0 ? (
                <ArrowUpRight className="size-3.5" aria-hidden />
              ) : (
                <ArrowDownRight className="size-3.5" aria-hidden />
              )}
              {amountsHidden ? (
                change > 0 ? "Up" : "Down"
              ) : (
                <span>
                  {change > 0 ? "+" : "−"}
                  <Amount value={Math.abs(change)} />
                </span>
              )}
            </span>
          )}
          <span>since {shortDayLabel(first.date)}</span>
        </p>
      )}
      <p className="mt-0.5 text-xs text-muted-foreground">
        {trackedCount === accountCount
          ? `${accountCount} ${accountCount === 1 ? "account" : "accounts"}`
          : `${trackedCount} of ${accountCount} accounts counted`}
      </p>

      {/* mt-auto: when the card beside this one is taller, the line sits on the bottom edge. */}
      <div className="mt-auto pt-4">
        <NetBalanceTrend series={series} hideAmounts={amountsHidden} />
      </div>
    </section>
  );
}

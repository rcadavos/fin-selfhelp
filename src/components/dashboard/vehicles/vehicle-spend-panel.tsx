"use client";

import type { LucideIcon } from "lucide-react";
import { Equal, Info, TrendingDown, TrendingUp } from "lucide-react";
import { CountUpAmount } from "@/components/passbook/count-up-amount";
import { Amount } from "@/components/passbook/amount";
import { formatCompactNumber } from "@/lib/shared/number-format";
import { cn, formatCurrency } from "@/lib/utils";
import { monthName, monthYearLabel, type MonthTotal, type SpendingSummary } from "@/lib/vehicles/spending";

/** Tallest trend bar, in px. */
const TREND_BAR_MAX_PX = 56;

type Comparison = { icon: LucideIcon; tone: "up" | "down" | "neutral"; text: string };

const COMPARISON_TONE: Record<Comparison["tone"], string> = {
  // The amber the Expenses pace panel uses for running over, readable on the panel.
  up: "text-[hsl(39_67%_62%)]",
  down: "text-panel-accent",
  neutral: "text-panel-muted",
};

function compare(
  total: number,
  selectedMonth: string,
  previous: MonthTotal | null,
  isCurrentMonth: boolean,
  currency: string,
): Comparison | null {
  if (!previous) return null;
  const prevName = monthName(previous.month);
  if (total === 0 && previous.total === 0) {
    return {
      icon: Info,
      tone: "neutral",
      text: isCurrentMonth ? "Nothing recorded yet this month." : `Nothing recorded in ${monthName(selectedMonth)}.`,
    };
  }
  if (previous.total === 0) {
    return { icon: Info, tone: "neutral", text: `Nothing was recorded in ${prevName} to compare with.` };
  }
  const diff = total - previous.total;
  const by = formatCurrency(Math.abs(diff), currency);
  // A month still running is compared with the whole of the last one, and says so.
  const against = isCurrentMonth ? `all of ${prevName}` : prevName;
  const lead = isCurrentMonth ? "So far, " : "";
  if (diff > 0) return { icon: TrendingUp, tone: "up", text: `${lead}${by} more than ${against}.` };
  if (diff < 0) return { icon: TrendingDown, tone: "down", text: `${lead}${by} less than ${against}.` };
  return { icon: Equal, tone: "neutral", text: `The same as ${against}.` };
}

function TrendBars({ trend, currency }: { trend: MonthTotal[]; currency: string }) {
  const max = trend.reduce((m, t) => Math.max(m, t.total), 0);
  const description = trend
    .map((t) => `${monthYearLabel(t.month, "long")}: ${formatCurrency(t.total, currency)}`)
    .join(", ");

  return (
    <div role="img" aria-label={`Last ${trend.length} months. ${description}`} className="flex items-end gap-1.5 sm:gap-2">
      {trend.map((t, i) => {
        const selected = i === trend.length - 1;
        const height = max > 0 && t.total > 0 ? Math.max(4, Math.round((t.total / max) * TREND_BAR_MAX_PX)) : 2;
        return (
          <div
            key={t.month}
            title={`${monthYearLabel(t.month, "long")} • ${formatCurrency(t.total, currency)}`}
            className="flex h-[88px] flex-1 flex-col items-center justify-end gap-1 sm:w-10 sm:flex-none"
          >
            <span
              className={cn(
                "min-h-[10px] whitespace-nowrap font-mono text-[9.5px] leading-none",
                selected ? "text-panel-foreground" : "text-panel-muted",
              )}
            >
              {t.total > 0 ? formatCompactNumber(t.total) : ""}
            </span>
            <span
              className={cn(
                "block w-full max-w-[22px] rounded-b-[1px] rounded-t-[4px] transition-[height] duration-500",
                t.total > 0 ? (selected ? "bg-panel-accent" : "bg-panel-accent/40") : "bg-panel-foreground/20",
              )}
              style={{ height }}
            />
            <span
              className={cn(
                "font-mono text-[10px] leading-none",
                selected ? "font-semibold text-panel-foreground" : "text-panel-muted",
              )}
            >
              {monthName(t.month, "short")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The month's vehicle spending on the dark panel: the total, how it compares with
 * the month before, and the months leading up to it, so a heavy month (a repair,
 * a registration) reads as one against the usual run of fuel and tolls.
 */
export function VehicleSpendPanel({
  summary,
  isCurrentMonth,
  currency,
  label,
  className,
}: {
  summary: SpendingSummary;
  isCurrentMonth: boolean;
  currency: string;
  /** Accessible name for the panel, such as "Spending on all vehicles". */
  label: string;
  className?: string;
}) {
  const selectedMonth = summary.trend[summary.trend.length - 1]?.month ?? "";
  const comparison = compare(summary.total, selectedMonth, summary.previous, isCurrentMonth, currency);
  const count = summary.monthEntries.length;
  const CompareIcon = comparison?.icon;

  return (
    <section
      aria-label={label}
      className={cn(
        "surface relative overflow-hidden bg-panel p-4 text-panel-foreground shadow-[var(--shadow)] sm:p-5",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(hsl(var(--panel-accent)/0.055)_0_1px,transparent_1px_26px)]",
        className,
      )}
    >
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="fit-figure min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-panel-muted">
            {isCurrentMonth ? "Spent so far in" : "Spent in"} {monthYearLabel(selectedMonth, "long")}
          </p>
          <CountUpAmount
            value={summary.total}
            currency={currency}
            className="mt-1 block text-[32px] font-semibold leading-tight tracking-tight"
          />
          {comparison && CompareIcon && (
            <p className={cn("mt-1.5 flex items-start gap-1.5 text-[12.5px]", COMPARISON_TONE[comparison.tone])}>
              <CompareIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{comparison.text}</span>
            </p>
          )}
        </div>
        <TrendBars trend={summary.trend} currency={currency} />
      </div>

      <p className="relative z-10 mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-panel-foreground/15 pt-3 text-[11.5px] text-panel-muted">
        <span>
          {count} {count === 1 ? "entry" : "entries"} in {monthName(selectedMonth)}
        </span>
        {summary.average !== null && (
          <>
            <span aria-hidden>•</span>
            <span>
              Usually about{" "}
              <Amount value={Math.round(summary.average)} currency={currency} className="text-panel-foreground" /> a
              month
            </span>
          </>
        )}
      </p>
    </section>
  );
}

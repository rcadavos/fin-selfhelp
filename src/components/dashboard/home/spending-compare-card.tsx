"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Equal, Info, TrendingDown, TrendingUp } from "lucide-react";
import type { MonthlyBreakdownPoint } from "@/actions/expense-payments";
import { parseYmToYearMonth } from "@/lib/expense-due-date";
import { AMOUNT_MASK } from "@/lib/constants/dashboard";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Amount } from "@/components/passbook/amount";
import { CountUpAmount } from "@/components/passbook/count-up-amount";

function previousMonthYm(ym: string): string {
  const parsed = parseYmToYearMonth(ym);
  if (!parsed) return ym;
  const d = new Date(parsed.year, parsed.month1to12 - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthName(ym: string, locale: string): string {
  const parsed = parseYmToYearMonth(ym);
  if (!parsed) return ym;
  return new Date(parsed.year, parsed.month1to12 - 1, 1).toLocaleDateString(locale, { month: "long" });
}

/** Money out in a month: everyday spending plus bills paid. Savings are not spending. */
function spentIn(rows: MonthlyBreakdownPoint[], ym: string): number {
  const row = rows.find((r) => r.month === ym);
  return row ? row.expenses + (row.billsPaid ?? 0) : 0;
}

type Verdict = { tone: "good" | "watch" | "neutral"; icon: LucideIcon; text: string };

function verdict(thisMonth: number, lastMonth: number, lastName: string, hidden: boolean): Verdict {
  if (thisMonth === 0 && lastMonth === 0) {
    return { tone: "neutral", icon: Info, text: "Nothing spent yet this month." };
  }
  if (lastMonth === 0) {
    return { tone: "neutral", icon: Info, text: `Nothing was recorded in ${lastName} to compare with.` };
  }
  const diff = thisMonth - lastMonth;
  const by = hidden ? "" : `${formatCurrency(Math.abs(diff))} `;
  if (diff < 0) return { tone: "good", icon: TrendingDown, text: `So far, ${by}less than all of ${lastName}.` };
  if (diff > 0) return { tone: "watch", icon: TrendingUp, text: `So far, ${by}more than all of ${lastName}.` };
  return { tone: "neutral", icon: Equal, text: `The same as all of ${lastName} so far.` };
}

const VERDICT_TONE: Record<Verdict["tone"], string> = {
  good: "bg-primary/10 text-primary",
  watch: "bg-warning/10 text-warning",
  neutral: "bg-muted text-foreground/80",
};

function CompareBar({
  label,
  value,
  max,
  tone,
  hidden,
}: {
  label: string;
  value: number;
  max: number;
  tone: "current" | "previous";
  hidden: boolean;
}) {
  return (
    <div>
      <div className="fit-figure flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 font-medium">{label}</span>
        <span className="fit-figure shrink-0">{hidden ? AMOUNT_MASK : <Amount value={value} />}</span>
      </div>
      <div aria-hidden className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            tone === "current" ? "bg-primary" : "bg-chart-compare",
          )}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

/**
 * "Spending this month": the month so far against the whole of last month, as two
 * plain bars and one sentence. It replaces the six-month grouped bar chart, which
 * asked the reader to decode axes, a legend and two series to learn the same thing.
 */
export function SpendingCompareCard({
  rows,
  isPending,
  paidMonthYm,
  locale,
  amountsHidden,
}: {
  rows: MonthlyBreakdownPoint[];
  isPending: boolean;
  paidMonthYm: string;
  locale: string;
  amountsHidden: boolean;
}) {
  const prevYm = previousMonthYm(paidMonthYm);
  const thisName = monthName(paidMonthYm, locale);
  const lastName = monthName(prevYm, locale);
  const thisMonth = spentIn(rows, paidMonthYm);
  const lastMonth = spentIn(rows, prevYm);
  const max = Math.max(thisMonth, lastMonth, 1);
  const summary = verdict(thisMonth, lastMonth, lastName, amountsHidden);
  const SummaryIcon = summary.icon;

  return (
    <section
      aria-labelledby="spending-heading"
      className="surface min-w-0 border border-border bg-card p-4 sm:p-5"
    >
      <h2 id="spending-heading" className="text-base font-semibold">
        Spending this month
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Everyday spending and bills you paid. Savings are not counted.
      </p>

      {isPending ? (
        <div className="mt-4 space-y-3" role="status" aria-label="Loading spending">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-44 max-w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">So far in {thisName}</p>
          <p className="fit-figure text-2xl font-semibold leading-tight tracking-tight">
            {amountsHidden ? AMOUNT_MASK : <CountUpAmount value={thisMonth} />}
          </p>

          {(thisMonth > 0 || lastMonth > 0) && (
            <div className="mt-4 space-y-3">
              <CompareBar
                label={`${thisName}, so far`}
                value={thisMonth}
                max={max}
                tone="current"
                hidden={amountsHidden}
              />
              <CompareBar
                label={`All of ${lastName}`}
                value={lastMonth}
                max={max}
                tone="previous"
                hidden={amountsHidden}
              />
            </div>
          )}

          <p
            className={cn(
              "mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
              VERDICT_TONE[summary.tone],
            )}
          >
            <SummaryIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            {summary.text}
          </p>
        </>
      )}

      <Link
        href="/dashboard/expenses"
        className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        See my spending
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

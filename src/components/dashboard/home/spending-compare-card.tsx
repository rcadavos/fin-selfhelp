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
      <div className="fit-figure flex items-baseline justify-between gap-3 text-base">
        <span className="min-w-0 font-semibold">{label}</span>
        <span className="fit-figure shrink-0">{hidden ? AMOUNT_MASK : <Amount value={value} />}</span>
      </div>
      <div aria-hidden className="mt-1.5 h-3.5 overflow-hidden rounded-full bg-border">
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
      className="surface min-w-0 border border-border bg-card p-5 sm:p-6"
    >
      <h2 id="spending-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
        Spending this month
      </h2>
      <p className="mt-1 text-base text-muted-foreground">
        Everyday spending and bills you paid. Savings are not counted.
      </p>

      {isPending ? (
        <div className="mt-5 space-y-4" role="status" aria-label="Loading spending">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-52 max-w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : (
        <>
          <p className="mt-5 text-base text-muted-foreground sm:text-lg">So far in {thisName}</p>
          <p className="fit-figure text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {amountsHidden ? AMOUNT_MASK : <CountUpAmount value={thisMonth} />}
          </p>

          {(thisMonth > 0 || lastMonth > 0) && (
            <div className="mt-5 space-y-4">
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
              "mt-5 flex items-start gap-2 rounded-lg px-4 py-3 text-base font-semibold sm:text-lg",
              VERDICT_TONE[summary.tone],
            )}
          >
            <SummaryIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
            {summary.text}
          </p>
        </>
      )}

      <Link
        href="/dashboard/expenses"
        className="mt-3 inline-flex min-h-12 items-center gap-2 text-base font-bold text-primary hover:underline"
      >
        See my spending
        <ArrowRight className="size-5" aria-hidden />
      </Link>
    </section>
  );
}

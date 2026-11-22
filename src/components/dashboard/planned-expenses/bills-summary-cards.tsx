"use client";

import { CountUpAmount } from "@/components/passbook/count-up-amount";
import { SettledProgress } from "@/components/dashboard/planned-expenses/settled-progress";
import { cn, formatCurrency } from "@/lib/utils";
import { URGENCY_LABELS } from "@/lib/constants/planned-expenses";
import type {
  PlannedExpenseGroup,
  PlannedExpenseRow,
  PlannedExpenseSummary,
  UrgencyBucket,
} from "@/lib/planned-expenses/grouping";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function shortDate(row: PlannedExpenseRow): string {
  return row.due ? row.due.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "";
}

function BucketCard({
  label,
  dotClass,
  labelClass,
  amount,
  detail,
  currency,
}: {
  label: string;
  dotClass: string;
  labelClass: string;
  amount: number;
  detail: string;
  currency: string;
}) {
  return (
    <div className="surface fit-figure border border-border bg-card px-4 py-3.5 shadow-[var(--shadow)]">
      <p className={cn("flex items-center gap-1.5 text-[12.5px]", labelClass)}>
        <i className={cn("block size-2 rounded-full", dotClass)} aria-hidden />
        {label}
      </p>
      <CountUpAmount value={amount} currency={currency} className="mt-1.5 text-[22px] font-semibold tracking-tight" />
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

/**
 * The month in four numbers, for wide screens: what is left, and how much of it is
 * late, due within the week, or later. Each bucket card sums the same group the
 * list below renders, so a card and its section heading always agree.
 */
export function BillsSummaryCards({
  summary,
  groups,
  currency,
  monthLabel,
  className,
}: {
  summary: PlannedExpenseSummary;
  groups: PlannedExpenseGroup[];
  currency: string;
  monthLabel: string;
  className?: string;
}) {
  const group = (bucket: UrgencyBucket) => groups.find((g) => g.bucket === bucket);
  const overdue = group("overdue");
  const week = group("week");
  const later = group("later");

  const oldest = overdue?.rows[0];
  const lateDays = oldest?.daysFromToday != null ? Math.abs(oldest.daysFromToday) : null;
  const nextUp = week?.rows[0];
  const firstLater = later?.rows[0];

  return (
    <section aria-label={`${monthLabel} summary`} className={cn("grid grid-cols-2 gap-3.5 xl:grid-cols-4", className)}>
      <div className="surface fit-figure border border-border bg-card px-4 py-3.5 shadow-[var(--shadow)]">
        <p className="text-[12.5px] text-muted-foreground">Still to pay</p>
        <CountUpAmount
          value={summary.remaining}
          currency={currency}
          className="mt-1.5 text-[26px] font-semibold tracking-tight"
        />
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          of {formatCurrency(summary.total, currency)} in {monthLabel}
        </p>
        <SettledProgress summary={summary} className="mt-2.5" />
      </div>

      <BucketCard
        label={URGENCY_LABELS.overdue.full}
        dotClass="bg-destructive"
        labelClass="text-destructive"
        amount={overdue?.subtotal ?? 0}
        currency={currency}
        detail={
          overdue
            ? `${plural(overdue.rows.length, "bill")}${lateDays ? ` • oldest ${plural(lateDays, "day")} late` : ""}`
            : "Nothing overdue"
        }
      />
      <BucketCard
        label={URGENCY_LABELS.week.full}
        dotClass="bg-warning"
        labelClass="text-warning"
        amount={week?.subtotal ?? 0}
        currency={currency}
        detail={
          week && nextUp
            ? `${plural(week.rows.length, "bill")} • next ${nextUp.bill.note ?? "bill"}${nextUp.due ? `, ${shortDate(nextUp)}` : ""}`
            : "Nothing due this week"
        }
      />
      <BucketCard
        label={`Later in ${monthLabel}`}
        dotClass="bg-hairline-strong"
        labelClass="text-muted-foreground"
        amount={later?.subtotal ?? 0}
        currency={currency}
        detail={
          later && firstLater
            ? `${plural(later.rows.length, "bill")}${firstLater.due ? ` • from ${shortDate(firstLater)}` : ""}`
            : `Nothing else in ${monthLabel}`
        }
      />
    </section>
  );
}

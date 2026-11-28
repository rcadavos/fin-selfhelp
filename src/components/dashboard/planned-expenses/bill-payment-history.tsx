"use client";

import { useState } from "react";
import { ChevronRight, Undo2 } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import { Stamp } from "@/components/passbook/stamp";
import { CarryOverNote } from "@/components/dashboard/planned-expenses/carry-over";
import { paidMonthName } from "@/lib/paid-month";
import {
  groupBillHistoryByYear,
  paidDateLabel,
  type BillHistoryMonth,
  type BillMonthStatus,
} from "@/lib/planned-expenses/bill-history";
import {
  BILL_HISTORY_PREVIEW,
  PLANNED_EXPENSE_STAMP_VARIANT,
  PLANNED_EXPENSE_STATUS_LABEL,
} from "@/lib/constants/planned-expenses";
import { cn } from "@/lib/utils";

/** The month tile's tint follows the month's stamp. */
const MONTH_TILE_TONE: Record<BillMonthStatus, string> = {
  paid: "bg-primary/10 text-primary",
  partial: "bg-info/10 text-info",
  carried: "bg-muted text-muted-foreground",
};

function MonthTile({ month, status }: { month: string; status: BillMonthStatus }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-semibold uppercase tracking-[0.06em]",
        MONTH_TILE_TONE[status],
      )}
    >
      {paidMonthName(month, "short")}
    </span>
  );
}

function HistoryRow({
  entry,
  currentMonth,
  currentYear,
  currency,
  showAccounts,
  isPending,
  onEdit,
  onUndoCarryOver,
}: {
  entry: BillHistoryMonth;
  currentMonth: string;
  currentYear: number;
  currency: string;
  showAccounts: boolean;
  isPending: boolean;
  onEdit: (entry: BillHistoryMonth) => void;
  onUndoCarryOver: (month: string) => void;
}) {
  const { month, payment, carryOut, carryIn, status, paid, due } = entry;
  const monthLabel = `${paidMonthName(month)} ${month.slice(0, 4)}`;
  const accountAlias = showAccounts ? payment?.account_alias : null;

  const body = (
    <>
      <MonthTile month={month} status={status} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">{paidMonthName(month)}</span>
          <Stamp variant={PLANNED_EXPENSE_STAMP_VARIANT[status]} className="px-1.5 py-px text-[9px]">
            {PLANNED_EXPENSE_STATUS_LABEL[status]}
          </Stamp>
          {month === currentMonth && <span className="text-[11px] text-muted-foreground">This month</span>}
        </span>
        {payment && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-muted-foreground">
            <span>Paid {paidDateLabel(payment.paid_at, currentYear)}</span>
            {accountAlias && (
              <>
                <span aria-hidden>•</span>
                <span className="inline-flex min-w-0 items-center gap-1">
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: payment.account_color ?? "#6b7280" }}
                  />
                  <span className="truncate">{accountAlias}</span>
                </span>
              </>
            )}
          </span>
        )}
        {carryOut && (
          <CarryOverNote
            direction="out"
            amount={carryOut.amount}
            month={carryOut.to_month}
            note={carryOut.note}
            currency={currency}
            className="mt-0.5"
            as="span"
          />
        )}
        {carryIn && (
          <CarryOverNote
            direction="in"
            amount={carryIn.amount}
            month={carryIn.from_month}
            note={carryIn.note}
            currency={currency}
            className="mt-0.5"
            as="span"
          />
        )}
      </span>
      <span className="fit-figure shrink-0 text-right">
        <Amount
          value={payment ? paid : (carryOut?.amount ?? 0)}
          currency={currency}
          className={cn("text-sm", !payment && "text-muted-foreground")}
        />
        {status === "partial" && (
          <span className="block text-[11px] text-muted-foreground">
            of <Amount value={due} currency={currency} />
          </span>
        )}
      </span>
    </>
  );

  // A carried month's payments are locked, so its only action is the undo.
  if (carryOut) {
    return (
      <li className="flex items-center gap-3 py-2.5 pl-3 pr-2">
        {body}
        <button
          type="button"
          onClick={() => onUndoCarryOver(month)}
          disabled={isPending}
          aria-label={`Undo the ${monthLabel} carry-over`}
          title={`Undo the ${monthLabel} carry-over`}
          className="tap-target inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <Undo2 className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Undo</span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onEdit(entry)}
        disabled={isPending}
        aria-label={`Edit the ${monthLabel} payment`}
        className="flex w-full items-center gap-3 py-2.5 pl-3 pr-2 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60"
      >
        {body}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
    </li>
  );
}

/**
 * Every month the bill was paid or carried over, newest first and grouped by year
 * with what each year paid. Tapping a payment opens it for editing; a carried
 * month offers the undo instead. Long histories fold after a year's worth.
 */
export function BillPaymentHistory({
  months,
  currentMonth,
  currency,
  showAccounts,
  isPending,
  onEdit,
  onUndoCarryOver,
  className,
}: {
  /** Newest first, from `buildBillHistoryMonths`. */
  months: BillHistoryMonth[];
  currentMonth: string;
  currency: string;
  showAccounts: boolean;
  isPending: boolean;
  onEdit: (entry: BillHistoryMonth) => void;
  onUndoCarryOver: (month: string) => void;
  className?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const currentYear = Number(currentMonth.slice(0, 4));
  const shown = showAll ? months : months.slice(0, BILL_HISTORY_PREVIEW);
  const years = groupBillHistoryByYear(shown);
  const hasEditable = months.some((m) => m.payment && !m.carryOut);

  return (
    <section aria-labelledby="bill-history-heading" className={cn("space-y-3", className)}>
      <div className="px-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="bill-history-heading" className="text-[13.5px] font-semibold">
            Payment history
          </h2>
          {months.length > 0 && (
            <span className="text-[11.5px] text-muted-foreground">
              {months.length} {months.length === 1 ? "month" : "months"}
            </span>
          )}
        </div>
        {hasEditable && (
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Tap a payment to change its amount, date{showAccounts ? " or account" : ""}, or to remove it.
          </p>
        )}
      </div>

      {months.length === 0 ? (
        <div className="surface flex flex-col items-center gap-1.5 border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium">No payments yet</p>
          <p className="max-w-[44ch] text-xs leading-relaxed text-muted-foreground">
            Mark this bill paid and each month&rsquo;s payment shows up here, where you can still change it later.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {years.map((group) => (
            <div key={group.year}>
              <div className="flex items-baseline px-0.5 pb-1.5">
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {group.year}
                </span>
                <DotLeader />
                <span className="pb-px text-[12.5px] text-muted-foreground">
                  <Amount value={group.paid} currency={currency} className="text-foreground" /> paid
                </span>
              </div>
              <ul className="surface divide-y divide-border overflow-hidden border border-border bg-card">
                {group.months.map((entry) => (
                  <HistoryRow
                    key={entry.month}
                    entry={entry}
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    currency={currency}
                    showAccounts={showAccounts}
                    isPending={isPending}
                    onEdit={onEdit}
                    onUndoCarryOver={onUndoCarryOver}
                  />
                ))}
              </ul>
            </div>
          ))}
          {months.length > BILL_HISTORY_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="self-start text-[12.5px] font-medium text-primary hover:underline"
            >
              {showAll ? "Show fewer" : `Show all ${months.length} months`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

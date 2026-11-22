"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  TriangleAlert,
} from "lucide-react";
import { markBillPaid, unmarkBillPaid, type BillsData } from "@/actions/bills";
import { queryKeys } from "@/lib/query/keys";
import { invalidateAccountQueries } from "@/lib/query/accounts";
import { ADD_PLANNED_EXPENSE_PARAM } from "@/lib/constants/app-mode";
import { AMOUNT_MASK, DASHBOARD_DUE_SOON_DAYS } from "@/lib/constants/dashboard";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { Amount } from "@/components/passbook/amount";
import { CountUpAmount } from "@/components/passbook/count-up-amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import { StatusPill, type StatusPillVariant } from "@/components/passbook/status-pill";

/** One of this month's bills, as the dashboard reads it. */
export type DashboardBillItem = {
  id: string;
  name: string;
  amount: number;
  /** What has been paid this month, 0 when nothing has. */
  paidAmount: number;
  /** Auto-debit is on and the current app mode honours it. */
  autoDebit: boolean;
  /** This month's auto-debit was tried and failed. */
  autoDebitFailed: boolean;
  due: Date | null;
};

export function isBillFullyPaid(item: DashboardBillItem): boolean {
  // Half a centavo of slack so a float-rounded payment still counts as settled.
  return item.paidAmount > 0 && item.paidAmount + 0.005 >= item.amount;
}

const DAY_MS = 24 * 60 * 60 * 1000;

type RowStatus = {
  variant: StatusPillVariant;
  icon: LucideIcon;
  label: string;
  /** Auto-debit will settle it: no button, just reassurance. */
  paysItself: boolean;
};

function rowStatus(
  item: DashboardBillItem,
  today: Date,
  locale: string,
  amountsHidden: boolean,
): RowStatus {
  const dateLabel = item.due?.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const daysAway = item.due ? Math.round((item.due.getTime() - today.getTime()) / DAY_MS) : null;

  if (item.autoDebitFailed) {
    return { variant: "overdue", icon: TriangleAlert, label: "Auto-debit failed", paysItself: false };
  }
  if (item.paidAmount > 0) {
    const left = item.amount - item.paidAmount;
    return {
      variant: "partial",
      icon: Clock,
      label: amountsHidden
        ? "Part-paid"
        : `${formatCurrency(item.paidAmount)} paid • ${formatCurrency(left)} left`,
      paysItself: false,
    };
  }
  if (daysAway !== null && daysAway < 0) {
    return {
      variant: "overdue",
      icon: TriangleAlert,
      label: `Overdue • was due ${dateLabel}`,
      paysItself: false,
    };
  }
  if (item.autoDebit) {
    return {
      variant: "scheduled",
      icon: CalendarDays,
      label: dateLabel ? `Auto-debit • ${dateLabel}` : "Auto-debit this month",
      paysItself: true,
    };
  }
  if (daysAway === 0) return { variant: "due", icon: Clock, label: "Due today", paysItself: false };
  if (daysAway === 1) return { variant: "due", icon: Clock, label: "Due tomorrow", paysItself: false };
  if (daysAway !== null && daysAway <= DASHBOARD_DUE_SOON_DAYS) {
    return { variant: "due", icon: Clock, label: `Due ${dateLabel}`, paysItself: false };
  }
  return {
    variant: "muted",
    icon: CalendarDays,
    label: dateLabel ? `Due ${dateLabel}` : "Due this month",
    paysItself: false,
  };
}

const ACTION_BUTTON = "h-9 w-full gap-1.5 rounded-lg px-3 text-sm font-semibold sm:w-auto";

/**
 * "Bills to pay": this month's unsettled bills, each with its own Mark as paid
 * button, and the amount still to pay underneath.
 *
 * A bill marked paid here stays in its row (as Paid, with Undo) until the page is
 * left, so a mis-tap is easy to see and to take back, and rows never jump around
 * under the reader's finger.
 */
export function BillsToPayCard({
  items,
  paidMonth,
  monthLabel,
  isLoading,
  amountsHidden,
  locale,
  stillToPay,
  rowLimit,
  accountNames,
}: {
  /** Every bill due this month, soonest due first. */
  items: DashboardBillItem[];
  /** The `YYYY-MM` month the bills query and the payment actions use. */
  paidMonth: string;
  monthLabel: string;
  isLoading: boolean;
  amountsHidden: boolean;
  locale: string;
  stillToPay: number;
  rowLimit: number;
  /** Account names by id, for the not-enough-money message. */
  accountNames: Record<string, string>;
}) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useSnackbar();
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  // Bills paid from this card during this visit → what had been paid before, for Undo.
  const [justPaid, setJustPaid] = useState<ReadonlyMap<string, number>>(new Map());

  const queryKey = queryKeys.billData(paidMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visible = items
    .filter((item) => !isBillFullyPaid(item) || justPaid.has(item.id))
    .slice(0, rowLimit);
  const settledCount = items.filter(isBillFullyPaid).length;

  function setPending(id: string, pending: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Writes `amount` as this month's payment in the cached bills data (0 clears it). */
  function setCachedPayment(id: string, amount: number) {
    queryClient.setQueryData<BillsData | null>(queryKey, (old) => {
      if (!old) return old;
      if (amount <= 0) {
        const amounts = { ...old.paymentAmountByBillId };
        delete amounts[id];
        const paidAt = { ...old.paidAtByBillId };
        delete paidAt[id];
        return {
          ...old,
          paidBillIds: old.paidBillIds.filter((b) => b !== id),
          paymentAmountByBillId: amounts,
          paidAtByBillId: paidAt,
        };
      }
      const reasons = { ...old.failureReasonByBillId };
      delete reasons[id];
      return {
        ...old,
        paidBillIds: old.paidBillIds.includes(id) ? old.paidBillIds : [...old.paidBillIds, id],
        paymentAmountByBillId: { ...old.paymentAmountByBillId, [id]: amount },
        paidAtByBillId: {
          ...old.paidAtByBillId,
          [id]: old.paidAtByBillId[id] ?? new Date().toISOString(),
        },
        failedBillIds: old.failedBillIds.filter((b) => b !== id),
        failureReasonByBillId: reasons,
      };
    });
  }

  function refreshAfterPayment() {
    queryClient.invalidateQueries({ queryKey });
    invalidateAccountQueries(queryClient);
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "expenses"] });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "monthly-breakdown"] });
  }

  async function handleMarkPaid(item: DashboardBillItem) {
    const snapshot = queryClient.getQueryData(queryKey);
    setCachedPayment(item.id, item.amount);
    setJustPaid((prev) => new Map(prev).set(item.id, item.paidAmount));
    setPending(item.id, true);

    const res = await markBillPaid(item.id, paidMonth);
    setPending(item.id, false);

    if (res.error) {
      queryClient.setQueryData(queryKey, snapshot);
      setJustPaid((prev) => {
        const next = new Map(prev);
        next.delete(item.id);
        return next;
      });
      if (res.error === "insufficient_balance" && res.insufficientBalance) {
        const { accountId, available, required } = res.insufficientBalance;
        const account = accountNames[accountId] ?? "the linked account";
        showError(
          `There isn't enough money in ${account} to pay ${item.name}. It has ${formatCurrency(available)} and the bill needs ${formatCurrency(required)}.`,
        );
      } else {
        showError(`Couldn't mark ${item.name} as paid. Please try again.`);
      }
      return;
    }

    showSuccess(`${item.name} is marked as paid.`);
    refreshAfterPayment();
  }

  async function handleUndo(item: DashboardBillItem) {
    const previous = justPaid.get(item.id) ?? 0;
    const snapshot = queryClient.getQueryData(queryKey);
    setCachedPayment(item.id, previous);
    setPending(item.id, true);

    // A bill that was part-paid before goes back to that part-payment, not to nothing.
    const res =
      previous > 0
        ? await markBillPaid(item.id, paidMonth, previous)
        : await unmarkBillPaid(item.id, paidMonth);
    setPending(item.id, false);

    if (res.error) {
      queryClient.setQueryData(queryKey, snapshot);
      showError(`Couldn't undo the payment for ${item.name}. Please try again.`);
      return;
    }

    setJustPaid((prev) => {
      const next = new Map(prev);
      next.delete(item.id);
      return next;
    });
    refreshAfterPayment();
  }

  return (
    <section
      id="bills-to-pay"
      aria-labelledby="bills-to-pay-heading"
      className="surface min-w-0 scroll-mt-24 overflow-hidden border border-border bg-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3 sm:px-5">
        <h2 id="bills-to-pay-heading" className="text-base font-semibold">
          Bills to pay
        </h2>
        <span className="text-sm text-muted-foreground">{monthLabel}</span>
      </div>

      {isLoading ? (
        <div className="space-y-5 px-4 py-4 sm:px-5" role="status" aria-label="Loading bills">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-8 w-40" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-8 text-center sm:px-5">
          <p className="text-sm text-muted-foreground">No bills this month.</p>
          <Link
            href={`/dashboard/bills?${ADD_PLANNED_EXPENSE_PARAM}=1`}
            className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Add a bill
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          {visible.length === 0 ? (
            <p className="flex items-center gap-2 border-b border-border px-4 py-5 text-sm font-semibold text-primary sm:px-5">
              <CircleCheck className="size-5 shrink-0" aria-hidden />
              Every bill for {monthLabel} is paid. Nice work!
            </p>
          ) : (
            <ul>
              {visible.map((item) => {
                const paidNow = justPaid.has(item.id) && isBillFullyPaid(item);
                const status = rowStatus(item, today, locale, amountsHidden);
                const pending = pendingIds.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-2.5 border-b border-border px-4 py-3 sm:px-5",
                      !paidNow && status.variant === "overdue" && "bg-destructive/[0.04]",
                    )}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className={cn(
                          "min-w-0 truncate text-sm font-medium",
                          paidNow && "text-muted-foreground line-through",
                        )}
                      >
                        {item.name}
                      </span>
                      <DotLeader />
                      <span
                        className={cn("shrink-0 text-sm", paidNow && "text-muted-foreground line-through")}
                      >
                        {amountsHidden ? AMOUNT_MASK : <Amount value={item.amount} />}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {paidNow ? (
                        <StatusPill variant="paid" icon={Check}>
                          Paid
                        </StatusPill>
                      ) : (
                        <StatusPill variant={status.variant} icon={status.icon}>
                          {status.label}
                        </StatusPill>
                      )}

                      {paidNow ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleUndo(item)}
                          disabled={pending}
                          aria-label={`Undo the payment for ${item.name}`}
                          className={cn(ACTION_BUTTON, "border-hairline-strong")}
                        >
                          {pending ? "Saving…" : "Undo"}
                        </Button>
                      ) : status.paysItself ? (
                        <span className="text-sm text-muted-foreground">Pays itself. Nothing to do.</span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleMarkPaid(item)}
                          disabled={pending}
                          aria-label={
                            item.paidAmount > 0
                              ? `Pay the rest of ${item.name}`
                              : `Mark ${item.name} as paid`
                          }
                          className={cn(
                            ACTION_BUTTON,
                            "border-primary bg-card text-primary hover:bg-primary hover:text-primary-foreground",
                          )}
                        >
                          <Check aria-hidden />
                          {pending ? "Saving…" : item.paidAmount > 0 ? "Pay the rest" : "Mark as paid"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="fit-figure flex items-baseline gap-2 bg-primary/5 px-4 py-3 sm:px-5">
            <span className="shrink-0 text-sm font-semibold">Still to pay</span>
            <DotLeader />
            <span className="fit-figure text-sm font-semibold">
              {amountsHidden ? AMOUNT_MASK : <CountUpAmount value={stillToPay} />}
            </span>
          </div>

          <Link
            href="/dashboard/bills"
            className="flex min-h-11 items-center gap-1.5 border-t border-border px-4 py-2.5 text-sm font-semibold text-primary hover:underline sm:px-5"
          >
            See all {items.length} {items.length === 1 ? "bill" : "bills"}
            {settledCount > 0
              ? `, including the ${settledCount} you paid`
              : ""}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        </>
      )}
    </section>
  );
}

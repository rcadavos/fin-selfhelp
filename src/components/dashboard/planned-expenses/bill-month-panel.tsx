"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Forward,
  Pencil,
  PiggyBank,
  RotateCcw,
  Undo2,
  X,
} from "lucide-react";
import { CountUpAmount } from "@/components/passbook/count-up-amount";
import { CarryOverNote } from "@/components/dashboard/planned-expenses/carry-over";
import { paidMonthName } from "@/lib/paid-month";
import { paidDateLabel } from "@/lib/planned-expenses/bill-history";
import {
  BILL_PANEL_METER_FILL,
  BILL_PANEL_STATUS_TONE,
  PLANNED_EXPENSE_STATUS_LABEL,
} from "@/lib/constants/planned-expenses";
import { cn, formatCurrency } from "@/lib/utils";
import type { BillPaymentHistoryRow } from "@/actions/bills";
import type { PlannedExpenseRow } from "@/lib/planned-expenses/grouping";

const LEDGER_RULE =
  "after:pointer-events-none after:absolute after:inset-0 after:bg-[repeating-linear-gradient(hsl(var(--panel-accent)/0.055)_0_1px,transparent_1px_26px)]";

// flex-auto on phones: two buttons share a line when they fit and each takes a full
// line when they don't, instead of squeezing their labels onto two lines.
const PRIMARY_BUTTON =
  "inline-flex min-h-11 flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-panel-accent px-4 py-2.5 text-[13.5px] font-semibold text-panel transition-[filter] hover:brightness-110 disabled:opacity-60 sm:flex-none";
const OUTLINE_BUTTON =
  "inline-flex min-h-11 flex-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-panel-foreground/30 px-4 py-2.5 text-[13.5px] font-semibold text-panel-foreground transition-colors hover:bg-panel-foreground/10 disabled:opacity-60 sm:flex-none";
const LINK_BUTTON =
  "tap-target inline-flex items-center gap-1.5 rounded-md text-left text-[12.5px] font-medium text-panel-muted transition-colors hover:text-panel-foreground disabled:opacity-60";

/** "3 days late", "Due today", "in 3 days". */
function whenLabel(daysFromToday: number): string {
  if (daysFromToday === 0) return "Due today";
  const days = Math.abs(daysFromToday);
  const span = `${days} day${days === 1 ? "" : "s"}`;
  return daysFromToday < 0 ? `${span} late` : `in ${span}`;
}

export type BillPanelError = { message: string; showAccountsLink: boolean };

/**
 * The bill in the month you are in, on the dark panel: what it asks for, what is
 * paid or left, when it falls due, and the one or two things to do about it.
 * Once paid, the payment itself can be corrected or taken back from here.
 */
export function BillMonthPanel({
  row,
  monthLabel,
  payment,
  showAccount,
  currency,
  failureReason,
  carryTargetLabel,
  isPending,
  error,
  onDismissError,
  onMarkPaid,
  onPartialPayment,
  onCarryOver,
  onUndoCarryOver,
  onEditPayment,
  onMarkUnpaid,
}: {
  /** The bill's row for the month, from `buildPlannedExpenseRows`. */
  row: PlannedExpenseRow;
  /** The month the panel is about, such as "November 2026". */
  monthLabel: string;
  /** The month's recorded payment, when there is one. */
  payment: BillPaymentHistoryRow | null;
  /** Show which account paid it; off when accounts are switched off. */
  showAccount: boolean;
  currency: string;
  failureReason: string | null;
  /** Month it can be carried over to ("December"), or null when it can't be. */
  carryTargetLabel: string | null;
  isPending: boolean;
  error: BillPanelError | null;
  onDismissError: () => void;
  /** Pays what is left in full. */
  onMarkPaid: () => void;
  onPartialPayment: () => void;
  onCarryOver: () => void;
  onUndoCarryOver: () => void;
  onEditPayment: () => void;
  onMarkUnpaid: () => void;
}) {
  const { status, due, daysFromToday, amountDue, amountPaid, outstanding, carriedIn, carryOut } = row;
  const isPaid = status === "paid";
  const isPartial = status === "partial";
  const isCarried = status === "carried";
  const isLate = daysFromToday !== null && daysFromToday < 0;

  const headline = isCarried ? (carryOut?.amount ?? 0) : isPaid ? amountPaid : isPartial ? outstanding : amountDue;
  const caption = isCarried
    ? `carried to ${paidMonthName(carryOut?.toMonth ?? "")}${
        amountPaid > 0 ? ` • ${formatCurrency(amountPaid, currency)} paid before that` : ""
      }`
    : isPaid
      ? amountPaid > amountDue
        ? `paid • ${formatCurrency(amountPaid - amountDue, currency)} more than it asked for`
        : "paid in full"
      : isPartial
        ? `left to pay • ${formatCurrency(amountPaid, currency)} of ${formatCurrency(amountDue, currency)} paid`
        : "to pay";
  const meterShare = amountDue > 0 ? Math.min(1, amountPaid / amountDue) : 1;

  const paidAtIso = payment?.paid_at ?? row.paidAt?.toISOString() ?? null;
  const currentYear = new Date().getFullYear();
  const dueText = due ? due.toLocaleDateString("en-PH", { month: "long", day: "numeric" }) : null;
  const timing = isPaid
    ? paidAtIso
      ? `Paid ${paidDateLabel(paidAtIso, currentYear)}${
          showAccount && payment?.account_alias ? ` • from ${payment.account_alias}` : ""
        }`
      : "Paid"
    : isCarried
      ? null
      : dueText
        ? `${isLate ? "Was due" : "Due"} ${dueText}${daysFromToday !== null ? ` • ${whenLabel(daysFromToday)}` : ""}`
        : "No due date this month";

  return (
    <section
      aria-label="This month"
      className={cn(
        "surface relative overflow-hidden bg-panel p-5 text-panel-foreground shadow-[var(--shadow)] sm:p-6",
        LEDGER_RULE,
      )}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.11em] text-panel-muted">{monthLabel}</p>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border border-current px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.09em]",
              BILL_PANEL_STATUS_TONE[status],
            )}
          >
            {PLANNED_EXPENSE_STATUS_LABEL[status]}
          </span>
        </div>

        <div className="fit-figure mt-2">
          <CountUpAmount
            value={headline}
            currency={currency}
            className="block text-[34px] font-semibold leading-tight tracking-tight sm:text-[40px]"
          />
        </div>
        <p className="mt-0.5 text-[13px] text-panel-muted">{caption}</p>

        {(isPaid || isPartial) && (
          <div
            role="meter"
            aria-label="Paid so far"
            aria-valuemin={0}
            aria-valuemax={amountDue}
            aria-valuenow={Math.min(amountPaid, amountDue)}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel-foreground/15"
          >
            <span
              className={cn(
                "block h-full rounded-full transition-[width] duration-500",
                BILL_PANEL_METER_FILL[isPaid ? "paid" : "partial"],
              )}
              style={{ width: `${meterShare * 100}%` }}
            />
          </div>
        )}

        {timing && (
          <p className="mt-3 flex items-start gap-1.5 text-[12.5px] text-panel-muted">
            <CalendarClock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{timing}</span>
          </p>
        )}
        {carriedIn && (
          <CarryOverNote
            direction="in"
            amount={carriedIn.amount}
            month={carriedIn.fromMonth}
            note={carriedIn.note}
            currency={currency}
            className="text-[12px] text-panel-muted"
          />
        )}
        {carryOut?.note && (
          <p className="mt-1 whitespace-pre-line break-words text-[12px] text-panel-muted">{carryOut.note}</p>
        )}

        {status === "failed" && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2 rounded-xl border border-panel-foreground/15 bg-panel-foreground/5 p-3 text-[12.5px]"
          >
            <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", BILL_PANEL_STATUS_TONE.failed)} aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">Auto-debit did not go through</p>
              {failureReason && <p className="mt-0.5 text-panel-muted">{failureReason}</p>}
              <p className="mt-0.5 text-panel-muted">It tries again on the next run, or you can mark it paid yourself.</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {isCarried ? (
            // The month is locked while carried over: undoing is the only way back in.
            <button type="button" onClick={onUndoCarryOver} disabled={isPending} className={OUTLINE_BUTTON}>
              <Undo2 className="size-4" aria-hidden />
              Undo carry-over
            </button>
          ) : isPaid ? (
            <>
              <button type="button" onClick={onEditPayment} disabled={isPending || !payment} className={OUTLINE_BUTTON}>
                <Pencil className="size-4" aria-hidden />
                Edit payment
              </button>
              <button type="button" onClick={onMarkUnpaid} disabled={isPending} className={OUTLINE_BUTTON}>
                <RotateCcw className="size-4" aria-hidden />
                Mark unpaid
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onMarkPaid} disabled={isPending} className={PRIMARY_BUTTON}>
                <Check className="size-4" strokeWidth={3} aria-hidden />
                {isPartial ? `Pay the rest • ${formatCurrency(outstanding, currency)}` : "Mark paid"}
              </button>
              <button type="button" onClick={onPartialPayment} disabled={isPending} className={OUTLINE_BUTTON}>
                <PiggyBank className="size-4" aria-hidden />
                {isPartial ? "Add to payment" : "Part payment"}
              </button>
            </>
          )}
        </div>

        {!isCarried && (isPartial || carryTargetLabel) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {isPartial && (
              <>
                <button type="button" onClick={onEditPayment} disabled={isPending || !payment} className={LINK_BUTTON}>
                  <Pencil className="size-3.5 shrink-0" aria-hidden />
                  Edit payment
                </button>
                <button type="button" onClick={onMarkUnpaid} disabled={isPending} className={LINK_BUTTON}>
                  <RotateCcw className="size-3.5 shrink-0" aria-hidden />
                  Mark unpaid
                </button>
              </>
            )}
            {carryTargetLabel && (
              <button type="button" onClick={onCarryOver} disabled={isPending} className={LINK_BUTTON}>
                <Forward className="size-3.5 shrink-0" aria-hidden />
                {isPartial
                  ? `Carry the rest over to ${carryTargetLabel}`
                  : `Can't pay it this month? Carry it over to ${carryTargetLabel}`}
              </button>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-panel-foreground/15 bg-panel-foreground/5 p-3 text-[12.5px]"
          >
            <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", BILL_PANEL_STATUS_TONE.overdue)} aria-hidden />
            <div className="min-w-0 flex-1">
              <p>{error.message}</p>
              {error.showAccountsLink && (
                <Link
                  href="/dashboard/accounts"
                  className="mt-1 inline-block font-medium text-panel-accent hover:underline"
                >
                  Go to Accounts
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Dismiss"
              className="tap-target -m-1 flex size-6 shrink-0 items-center justify-center rounded-full text-panel-muted transition-colors hover:bg-panel-foreground/10 hover:text-panel-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

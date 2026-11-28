"use client";

import { useRouter } from "next/navigation";
import { Bell, Car, Check, CheckCircle2, Forward, Lock, MoreHorizontal, Pencil, PiggyBank, RotateCcw, SkipForward, Trash2, TriangleAlert, Undo2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Amount } from "@/components/passbook/amount";
import { NotesPreview } from "@/components/app/notes-field";
import { Stamp, type StampVariant } from "@/components/passbook/stamp";
import type { LedgerDetailColumn } from "@/components/dashboard/planned-expenses/bills-ledger";
import { CarryOverNote } from "@/components/dashboard/planned-expenses/carry-over";
import { paidMonthName } from "@/lib/paid-month";
import { cn, formatCurrency } from "@/lib/utils";
import type { AccountRow } from "@/actions/accounts";
import type { VehicleRow } from "@/actions/vehicles";
import type { PlannedExpenseRow, PlannedExpenseStatus } from "@/lib/planned-expenses/grouping";
import { labelForVehicleExpenseCategory } from "@/lib/constants/vehicle-categories";
import {
  LEDGER_GRID_COLS,
  PLANNED_EXPENSE_STAMP_VARIANT,
  PLANNED_EXPENSE_STATUS_LABEL,
} from "@/lib/constants/planned-expenses";

/**
 * Colour only where action is needed. Six tinted row backgrounds made the list read
 * as a quilt, so status now lives in a stamp plus a 3px rail on the rows that are
 * actually behind — everything else stays on the plain card surface.
 */
const SEVERITY_RAIL: Partial<Record<PlannedExpenseStatus, string>> = {
  overdue: "before:bg-destructive",
  failed: "before:bg-destructive",
  partial: "before:bg-info",
};

const PERIOD_TAG: Record<string, string> = {
  monthly: "MO",
  quarterly: "QTR",
  yearly: "YR",
};

/** Roomier than the default menu item: this menu is the main way to act on a bill. */
const ACTION_ITEM = "min-h-12 gap-3 px-3 text-base max-sm:min-h-14 [&_svg]:size-5";

/** "Today", "9 days" ahead, or "3 days ago" — a day count with no status words. */
function dayCountLabel(daysFromToday: number): string {
  if (daysFromToday === 0) return "Today";
  const days = Math.abs(daysFromToday);
  const span = `${days} day${days === 1 ? "" : "s"}`;
  return daysFromToday < 0 ? `${span} ago` : span;
}

/**
 * The line under the amount. The stamp already names the status, so this is only
 * the timing: days until the due date ("9 days"), days since it passed or since the
 * bill was paid ("3 days ago"), or the month a skipped bill was carried to.
 */
function amountTimingLabel(row: PlannedExpenseRow, carriedTo: string | null): string | null {
  const { status, daysFromToday, paidAt } = row;
  if (status === "carried") return carriedTo ? `to ${carriedTo}` : null;
  if (status === "paid") {
    if (!paidAt) return null;
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(paidAt)) / 86_400_000);
    return dayCountLabel(-Math.max(0, daysAgo));
  }
  return daysFromToday === null ? null : dayCountLabel(daysFromToday);
}

/** "3d, 1d before, Due date" — the bill's own reminder schedule, in plain words. */
export function reminderLabelFor(reminderDays: number[] | null | undefined): string | null {
  if (!reminderDays?.length) return null;
  const before = reminderDays.filter((d) => d !== 0).sort((a, b) => b - a);
  const parts: string[] = [];
  if (before.length) parts.push(`${before.map((d) => `${d}d`).join(", ")} before`);
  if (reminderDays.includes(0)) parts.push("Due date");
  return parts.join(", ");
}

export function ExpenseRow({
  row,
  currency,
  categoryLabel,
  categoryColor,
  accountsEnabled,
  autoDebitEnabled,
  remindersProminent,
  detailColumn,
  account,
  vehicle,
  vehicleColor,
  shortfallNote,
  isLockedFreeReminder,
  isPending,
  carryTargetLabel,
  onToggle,
  onPartialClick,
  onCarryOver,
  onUndoCarryOver,
  onEdit,
  onDelete,
}: {
  row: PlannedExpenseRow;
  currency: string;
  categoryLabel: string;
  categoryColor: string;
  accountsEnabled: boolean;
  autoDebitEnabled: boolean;
  /** Bills mode: reminders are one of only two features, so they read on every row. */
  remindersProminent: boolean;
  /**
   * What the fourth column holds when the ledger is wide enough for its table
   * layout. That detail then leaves the meta line, so it is never shown twice.
   */
  detailColumn: LedgerDetailColumn;
  account: AccountRow | null;
  vehicle: VehicleRow | null;
  vehicleColor: string | null;
  /** Set when this bill's account cannot cover it — surfaced before you tap Mark paid. */
  shortfallNote: string | null;
  isLockedFreeReminder: boolean;
  isPending: boolean;
  /** Name of the month this bill can be carried over to ("December"), or null when it can't be. */
  carryTargetLabel: string | null;
  onToggle: () => void;
  onPartialClick: () => void;
  onCarryOver: () => void;
  onUndoCarryOver: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const { bill, status, outstanding, amountDue, carriedIn, carryOut } = row;
  const isPaid = status === "paid";
  const isPartial = status === "partial";
  const isCarried = status === "carried";
  const carriedToShort = carryOut ? paidMonthName(carryOut.toMonth, "short") : null;
  const amountTiming = amountTimingLabel(row, carriedToShort);
  const isLate = !isPaid && !isCarried && row.daysFromToday !== null && row.daysFromToday < 0;
  const reminderLabel = reminderLabelFor(bill.reminder_days_before);
  const accountInColumn = detailColumn === "account";
  const reminderInColumn = detailColumn === "reminder";

  // One stamp naming the status only. Its timing ("9 days", "3 days ago") sits under
  // the amount instead. It goes beside the name when stacked and in the Status column
  // when wide.
  const statusStamp: { variant: StampVariant; label: string } = {
    variant: PLANNED_EXPENSE_STAMP_VARIANT[status],
    label: status === "failed" ? "Auto-debit failed" : PLANNED_EXPENSE_STATUS_LABEL[status],
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/dashboard/bills/${bill.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/dashboard/bills/${bill.id}`);
        }
      }}
      className={cn(
        "relative flex cursor-pointer items-center gap-3 px-3 py-3 pl-4 transition-colors",
        // A table row once the ledger (the size container) is wide enough.
        "@2xl:grid",
        detailColumn ? LEDGER_GRID_COLS.withDetail : LEDGER_GRID_COLS.plain,
        "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-['']",
        SEVERITY_RAIL[status] ?? "before:bg-transparent",
      )}
    >
      {isCarried ? (
        // Not a toggle: the month is locked while it is carried over. Undo lives in the menu.
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-hairline-strong text-muted-foreground"
          title={`Skipped this month • carried to ${carriedToShort}`}
        >
          <SkipForward className="size-3.5" aria-hidden />
          <span className="sr-only">Skipped this month, carried to {carriedToShort}</span>
        </span>
      ) : (
        <button
          type="button"
          className={cn(
            "tap-target flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
            // Paid is a green disc with the tick in the opposite green, not the
            // near-black `primary-foreground` this used to use: light green
            // (#57C79A) on the deep fill in light mode, deep green (#10201A) on
            // the bright fill in dark. The empty ring stays for anything unpaid,
            // where it is the affordance.
            isPaid
              ? "border-primary bg-primary text-panel-accent dark:text-panel"
              : "border-hairline-strong text-transparent hover:border-primary hover:text-primary/40",
          )}
          aria-label={isPaid ? `Mark ${bill.note ?? categoryLabel} unpaid` : `Mark ${bill.note ?? categoryLabel} paid`}
          // Native tooltip on hover. The aria-label names the bill for screen
          // readers; the title stays short because the row already shows which.
          title={isPaid ? "Mark as unpaid" : "Mark as paid"}
          disabled={isPending}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <Check className={cn("transition-all", isPaid ? "size-5" : "size-4")} strokeWidth={3} aria-hidden />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "text-sm font-medium",
              isPaid && "text-muted-foreground line-through",
              isCarried && "text-muted-foreground",
            )}
          >
            {bill.note ?? categoryLabel}
          </span>
          {/* Status stamps sit beside the name in the stacked layout and move to
              their own column in the wide one. */}
          <Stamp variant={statusStamp.variant} className="@2xl:hidden">{statusStamp.label}</Stamp>
          {bill.is_auto_debit && autoDebitEnabled && status !== "failed" && (
            <Stamp variant="muted">
              <Zap className="size-2.5 text-primary" aria-hidden />
              Auto
            </Stamp>
          )}
          {isLockedFreeReminder && (
            <Stamp variant="due">
              <Lock className="size-2.5" aria-hidden />
              Reminder locked
            </Stamp>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-muted-foreground">
          <span style={{ color: categoryColor }}>{categoryLabel}</span>
          <span className="rounded-full border border-hairline-strong px-1.5 py-px font-mono text-[9.5px] tracking-wider">
            {PERIOD_TAG[bill.billing_period] ?? bill.billing_period}
          </span>
          {remindersProminent && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                reminderLabel ? "text-primary" : "text-muted-foreground",
                reminderInColumn && "@2xl:hidden",
              )}
            >
              <Bell className="size-3" aria-hidden />
              {reminderLabel ?? "No reminder"}
            </span>
          )}
          {vehicle && vehicleColor && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-px font-mono text-[9.5px]"
              style={{ backgroundColor: `${vehicleColor}22`, color: vehicleColor }}
            >
              <Car className="size-2.5" aria-hidden />
              {labelForVehicleExpenseCategory(bill.vehicle_category)
                ? `${vehicle.name} • ${labelForVehicleExpenseCategory(bill.vehicle_category)}`
                : vehicle.name}
            </span>
          )}
          {accountsEnabled && account && (
            <span
              className={cn("rounded-full px-1.5 py-px font-mono text-[9.5px]", accountInColumn && "@2xl:hidden")}
              style={{ backgroundColor: `${account.color}22`, color: account.color }}
            >
              {account.account_alias}
            </span>
          )}
        </div>

        <NotesPreview notes={bill.notes} />

        {carryOut && (
          <CarryOverNote
            direction="out"
            amount={carryOut.amount}
            month={carryOut.toMonth}
            note={carryOut.note}
            currency={currency}
          />
        )}
        {carriedIn && (
          <CarryOverNote
            direction="in"
            amount={carriedIn.amount}
            month={carriedIn.fromMonth}
            note={carriedIn.note}
            currency={currency}
          />
        )}

        {shortfallNote && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1.5 text-[11.5px] text-destructive",
              accountInColumn && "@2xl:hidden",
            )}
          >
            <Bell className="size-3 shrink-0" aria-hidden />
            {shortfallNote}
          </p>
        )}
      </div>

      {/* Wide layout only: Status column. */}
      <div className="hidden min-w-0 @2xl:block">
        <Stamp variant={statusStamp.variant}>{statusStamp.label}</Stamp>
      </div>

      {/* Wide layout only: the account (or, in bills mode, the reminder) column. */}
      {detailColumn && (
        <div className="hidden min-w-0 @2xl:block">
          {accountInColumn &&
            (account ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="truncate rounded-full px-2 py-0.5 font-mono text-[10.5px]"
                  style={{ backgroundColor: `${account.color}22`, color: account.color }}
                >
                  {account.account_alias}
                </span>
                {shortfallNote && (
                  <span title={shortfallNote} className="shrink-0 text-destructive">
                    <TriangleAlert className="size-3.5" aria-hidden />
                    <span className="sr-only">{shortfallNote}</span>
                  </span>
                )}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No account</span>
            ))}
          {reminderInColumn && (
            <span
              className={cn(
                "inline-flex min-w-0 items-center gap-1 text-xs",
                reminderLabel ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Bell className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{reminderLabel ?? "No reminder"}</span>
            </span>
          )}
        </div>
      )}

      <div className="shrink-0 text-right">
        <Amount
          value={carryOut ? carryOut.amount : isPartial ? outstanding : amountDue}
          currency={currency}
          className={cn(
            "text-sm",
            isPaid && "text-muted-foreground line-through",
            isCarried && "text-muted-foreground",
          )}
        />
        {isPartial && (
          // Two lines when stacked, so the amount column stays narrow on phones; one when wide.
          <p className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">
            <span className="block @2xl:inline">left of</span>{" "}
            <span className="block @2xl:inline">{formatCurrency(amountDue, currency)}</span>
          </p>
        )}
        {amountTiming && (
          <p className={cn("font-mono text-[10px]", isLate ? "text-destructive" : "text-muted-foreground")}>
            {amountTiming}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="ghost"
            className="tap-target shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
            disabled={isPending}
            aria-label={`${bill.note ?? categoryLabel} actions`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60 p-1.5" onClick={(e) => e.stopPropagation()}>
          {isCarried ? (
            <DropdownMenuItem className={ACTION_ITEM} onClick={(e) => { e.stopPropagation(); onUndoCarryOver(); }}>
              <Undo2 />
              Undo Carry-over
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem className={ACTION_ITEM} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
                {isPaid ? <RotateCcw /> : <CheckCircle2 className="text-primary" />}
                {isPaid ? "Mark Unpaid" : "Mark Paid"}
              </DropdownMenuItem>
              {!isPaid && (
                <DropdownMenuItem className={ACTION_ITEM} onClick={(e) => { e.stopPropagation(); onPartialClick(); }}>
                  <PiggyBank className="text-info" />
                  {isPartial ? "Add to Payment" : "Add Partial Payment"}
                </DropdownMenuItem>
              )}
              {carryTargetLabel && (
                <DropdownMenuItem className={ACTION_ITEM} onClick={(e) => { e.stopPropagation(); onCarryOver(); }}>
                  <Forward className="text-warning" />
                  Carry Over to {carryTargetLabel}
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuItem className={ACTION_ITEM} onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={cn(ACTION_ITEM, "text-destructive focus:text-destructive")}
          >
            <Trash2 />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Bell, Car, Check, CheckCircle2, Lock, MoreHorizontal, Pencil, PiggyBank, RotateCcw, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Amount } from "@/components/passbook/amount";
import { Stamp, type StampVariant } from "@/components/passbook/stamp";
import { cn, formatCurrency } from "@/lib/utils";
import type { AccountRow } from "@/actions/accounts";
import type { VehicleRow } from "@/actions/vehicles";
import type { PlannedExpenseRow, PlannedExpenseStatus } from "@/lib/planned-expenses/grouping";
import { labelForVehicleExpenseCategory } from "@/lib/constants/vehicle-categories";

/**
 * Colour only where action is needed. Six tinted row backgrounds made the list read
 * as a quilt, so status now lives in a stamp plus a 3px rail on the rows that are
 * actually behind — everything else stays on the plain card surface.
 */
const SEVERITY_RAIL: Partial<Record<PlannedExpenseStatus, string>> = {
  overdue: "before:bg-destructive",
  failed: "before:bg-destructive",
  partial: "before:bg-warning",
};

const STAMP_VARIANT: Record<PlannedExpenseStatus, StampVariant> = {
  paid: "paid",
  partial: "due",
  failed: "overdue",
  overdue: "overdue",
  due: "due",
  scheduled: "scheduled",
};

const PERIOD_TAG: Record<string, string> = {
  monthly: "MO",
  quarterly: "QTR",
  yearly: "YR",
};

function relativeDueLabel(row: PlannedExpenseRow): string | null {
  const { daysFromToday, status } = row;
  if (status === "paid") return null;
  if (daysFromToday === null) return null;
  if (daysFromToday < 0) {
    const late = Math.abs(daysFromToday);
    return `${late} day${late === 1 ? "" : "s"} late`;
  }
  if (daysFromToday === 0) return "Due today";
  return `in ${daysFromToday} day${daysFromToday === 1 ? "" : "s"}`;
}

/**
 * "Paid today" / "Paid 3 days ago", but only while the row still sits in Recently
 * paid — once it drops into Settled the exact day stopped mattering.
 */
function paidLabel(row: PlannedExpenseRow): string {
  if (row.bucket !== "recent" || !row.paidAt) return "Paid";
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(row.paidAt)) / 86_400_000);
  if (days <= 0) return "Paid today";
  if (days === 1) return "Paid yesterday";
  return `Paid ${days} days ago`;
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
  account,
  vehicle,
  vehicleColor,
  shortfallNote,
  isLockedFreeReminder,
  isPending,
  onToggle,
  onPartialClick,
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
  account: AccountRow | null;
  vehicle: VehicleRow | null;
  vehicleColor: string | null;
  /** Set when this bill's account cannot cover it — surfaced before you tap Mark paid. */
  shortfallNote: string | null;
  isLockedFreeReminder: boolean;
  isPending: boolean;
  onToggle: () => void;
  onPartialClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const { bill, status, outstanding, amountPaid } = row;
  const isPaid = status === "paid";
  const isPartial = status === "partial";
  const relative = relativeDueLabel(row);
  const reminderLabel = reminderLabelFor(bill.reminder_days_before);
  const dueDate = row.due
    ? row.due.toLocaleDateString("en-PH", { month: "short", day: "numeric" })
    : null;

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
        "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-['']",
        SEVERITY_RAIL[status] ?? "before:bg-transparent",
      )}
    >
      <button
        type="button"
        className={cn(
          "tap-target flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
          // Paid drops the ring and the fill entirely: a filled disc put a
          // near-black glyph inside a green circle inside this border. Just the
          // tick, in the accent, a size up. The empty ring stays as the
          // affordance for anything still unpaid.
          isPaid
            ? "border-transparent text-primary"
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

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("text-sm font-medium", isPaid && "text-muted-foreground line-through")}>
            {bill.note ?? categoryLabel}
          </span>
          {isPartial ? (
            <Stamp variant="due">
              {formatCurrency(amountPaid, currency)} of {formatCurrency(bill.amount, currency)}
            </Stamp>
          ) : relative ? (
            <Stamp variant={STAMP_VARIANT[status]}>{relative}</Stamp>
          ) : isPaid ? (
            <Stamp variant="paid">{paidLabel(row)}</Stamp>
          ) : null}
          {status === "failed" && <Stamp variant="overdue">Auto-debit failed</Stamp>}
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
          {dueDate && (
            <>
              <span className="opacity-45">•</span>
              <span>Due {dueDate}</span>
            </>
          )}
          <span className="rounded-full border border-hairline-strong px-1.5 py-px font-mono text-[9.5px] tracking-wider">
            {PERIOD_TAG[bill.billing_period] ?? bill.billing_period}
          </span>
          {remindersProminent && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                reminderLabel ? "text-primary" : "text-muted-foreground",
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
              className="rounded-full px-1.5 py-px font-mono text-[9.5px]"
              style={{ backgroundColor: `${account.color}22`, color: account.color }}
            >
              {account.account_alias}
            </span>
          )}
        </div>

        {shortfallNote && (
          <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-destructive">
            <Bell className="size-3 shrink-0" aria-hidden />
            {shortfallNote}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <Amount
          value={isPartial ? outstanding : bill.amount}
          currency={currency}
          className={cn("text-sm", isPaid && "text-muted-foreground line-through")}
        />
        {isPartial && <p className="font-mono text-[10px] text-muted-foreground">left</p>}
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
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            {isPaid ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4 text-primary" />}
            {isPaid ? "Mark Unpaid" : "Mark Paid"}
          </DropdownMenuItem>
          {!isPaid && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPartialClick(); }}>
              <PiggyBank className="size-4 text-warning" />
              {isPartial ? "Add to Payment" : "Add Partial Payment"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

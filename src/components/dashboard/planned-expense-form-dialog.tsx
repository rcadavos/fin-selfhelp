"use client";

import { useEffect, useState } from "react";
import { useAppMode } from "@/hooks/use-app-mode";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormPanel } from "@/components/app/form-panel";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { AccountSelect } from "@/components/app/account-select";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { subscriptionCapabilitiesQueryOptions } from "@/lib/query/subscription-user";
import { getDueDayOfMonthFromYmd } from "@/lib/expense-due-date";
import { TRANSPORT_EXPENSE_CATEGORY_ID } from "@/lib/constants/expense-categories";
import { VEHICLE_EXPENSE_CATEGORIES } from "@/lib/constants/vehicle-categories";
import { cn, formatCurrency } from "@/lib/utils";
import type { BillRow } from "@/actions/bills";
import type { AccountRow } from "@/actions/accounts";
import type { VehicleRow } from "@/actions/vehicles";

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export type BillFormState = {
  categoryId: string;
  note: string;
  amount: string;
  dueDate: string;
  endDate: string;
  billingPeriod: "monthly" | "quarterly" | "yearly";
  dueMonth: string;
  reminderDays: number[];
  accountId: string;
  vehicleId: string;
  vehicleCategory: string;
  autoDebit: boolean;
};

export const EMPTY_BILL_FORM: BillFormState = {
  categoryId: "",
  note: "",
  amount: "",
  dueDate: "",
  endDate: "",
  billingPeriod: "monthly",
  dueMonth: "1",
  reminderDays: [],
  accountId: "",
  vehicleId: "",
  vehicleCategory: "",
  autoDebit: false,
};

export function billToForm(bill: BillRow): BillFormState {
  const day = getDueDayOfMonthFromYmd(bill.due_date);
  return {
    categoryId: bill.category_id,
    note: bill.note ?? "",
    amount: String(bill.amount),
    dueDate: day ? String(day) : "15",
    endDate: bill.end_date ?? "",
    billingPeriod: bill.billing_period,
    dueMonth: String(bill.due_month ?? 1),
    reminderDays: bill.reminder_days_before ?? [],
    accountId: bill.account_id ?? "",
    vehicleId: bill.vehicle_id ?? "",
    vehicleCategory: bill.vehicle_category ?? "",
    autoDebit: bill.is_auto_debit,
  };
}

/**
 * Reminder days to persist for a form submission.
 *
 * Auto-debit clears reminders because the debit cron pays the bill — but only where
 * auto-debit actually runs. In an app mode that switches it off, the bill keeps its
 * reminder days. Shared so every call site agrees; a site left on the old inline
 * ternary would wipe reminders on that path only.
 */
export function reminderDaysToPersist(
  form: BillFormState,
  autoDebitAvailable: boolean,
): number[] | undefined {
  if (autoDebitAvailable && form.autoDebit) return undefined;
  return form.reminderDays.length > 0 ? form.reminderDays : undefined;
}

const REMINDER_OPTIONS = [
  { value: 5, label: "5d" },
  { value: 4, label: "4d" },
  { value: 3, label: "3d" },
  { value: 2, label: "2d" },
  { value: 1, label: "1d" },
  { value: 0, label: "On due date" },
] as const;

export function PlannedExpenseFormDialog({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
  editingBillId,
  isPending,
  accounts,
  vehicles,
  freeReminderUsed,
  lockedFreeReminderBillId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: BillFormState) => void;
  onDelete?: () => void;
  initial?: BillFormState;
  editingBillId?: string;
  isPending: boolean;
  accounts: AccountRow[];
  vehicles: VehicleRow[];
  freeReminderUsed: number;
  lockedFreeReminderBillId?: string;
}) {
  const { data: dbCategories } = useSuspenseQuery(categoriesQueryOptions());
  const { data: capabilities } = useSuspenseQuery(subscriptionCapabilitiesQueryOptions());
  const hasProAccess = capabilities?.hasProLevelAccess ?? false;
  const categories = dbCategories ?? [];

  const { isFeatureEnabled } = useAppMode();
  const accountsEnabled = isFeatureEnabled("accounts");
  const autoDebitAvailable = isFeatureEnabled("autoDebit");
  const [form, setForm] = useState<BillFormState>(initial ?? EMPTY_BILL_FORM);

  useEffect(() => {
    if (open) setForm(initial ?? EMPTY_BILL_FORM);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set<K extends keyof BillFormState>(key: K, val: BillFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function toggleReminder(day: number) {
    setForm((prev) => ({
      ...prev,
      reminderDays: prev.reminderDays.includes(day)
        ? prev.reminderDays.filter((d) => d !== day)
        : [...prev.reminderDays, day],
    }));
  }

  const amountNum = parseFloat(form.amount);
  const needsVehicleCategory =
    form.categoryId === TRANSPORT_EXPENSE_CATEGORY_ID &&
    Boolean(form.vehicleId) &&
    vehicles.length > 0;
  const hasVehicleCategoryWhenNeeded = !needsVehicleCategory || Boolean(form.vehicleCategory);
  const isValid =
    form.categoryId &&
    form.note.trim() &&
    !isNaN(amountNum) &&
    amountNum > 0 &&
    form.dueDate &&
    hasVehicleCategoryWhenNeeded;

  return (
    <FormPanel open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{editingBillId ? "Edit Planned Expense" : "Add Planned Expense"}</DialogTitle>
          {editingBillId && initial && (
            <p className="text-xs text-muted-foreground">
              {initial.note || "—"} · {formatCurrency(parseFloat(initial.amount) || 0)}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); if (isValid) onSave(form); }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollFadeBody className="space-y-5 px-6 pb-4">
          {/* Row 1 — Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="bill-name">Name</Label>
            <Input
              id="bill-name"
              placeholder="e.g. Internet, Electricity"
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              autoFocus
            />
          </div>

          {/* Account — hidden in an app mode without the accounts feature. form.accountId is
              left as-is so the stored link round-trips untouched. */}
          {accountsEnabled && accounts.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="bill-account">Account</Label>
              <AccountSelect
                id="bill-account"
                accounts={accounts}
                value={form.accountId}
                onChange={(id) => set("accountId", id)}
                allowClear
                placeholder="Select account (optional)"
              />
            </div>
          )}

          {/* Row 2 — Category + Amount */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => {
                  setForm((prev) => ({
                    ...prev,
                    categoryId: v,
                    ...(v !== TRANSPORT_EXPENSE_CATEGORY_ID
                      ? { vehicleId: "", vehicleCategory: "" }
                      : {}),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Amount</Label>
              <AmountInput
                placeholder="0.00"
                value={form.amount}
                onChange={(v) => set("amount", v)}
              />
            </div>
          </div>

          {/* Vehicle + vehicle category — Transport & Commute only */}
          {form.categoryId === TRANSPORT_EXPENSE_CATEGORY_ID && vehicles.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Vehicle (optional)</Label>
                <Select
                  value={form.vehicleId}
                  onValueChange={(v) => {
                    const id = v === "_none" ? "" : v;
                    setForm((prev) => ({
                      ...prev,
                      vehicleId: id,
                      vehicleCategory: id ? prev.vehicleCategory : "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link to a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— None —</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}{v.plate_number ? ` (${v.plate_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.vehicleId ? (
                <div className="grid gap-1.5">
                  <Label>
                    Vehicle category <span className="text-destructive">*</span>
                  </Label>
                  <Select value={form.vehicleCategory} onValueChange={(c) => set("vehicleCategory", c)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          )}

          {/* Row 3 — Recurrence (+ Due Month if yearly) */}
          <div className={cn("grid gap-3", form.billingPeriod === "yearly" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            <div className="grid gap-1.5">
              <Label>Recurrence</Label>
              <Select
                value={form.billingPeriod}
                onValueChange={(v) => set("billingPeriod", v as BillFormState["billingPeriod"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.billingPeriod === "yearly" && (
              <div className="grid gap-1.5">
                <Label>Due Month</Label>
                <Select value={form.dueMonth} onValueChange={(v) => set("dueMonth", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Row 4 — Due Date + End Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Due Date</Label>
              <Select value={form.dueDate} onValueChange={(v) => set("dueDate", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select day of the month" />
                </SelectTrigger>
                <SelectContent className="max-h-52">
                  <SelectItem value="15">{ordinal(15)} of the month</SelectItem>
                  <SelectItem value="31">End of the month</SelectItem>
                  <SelectSeparator />
                  {Array.from({ length: 31 }, (_, i) => i + 1)
                    .filter((d) => d !== 15 && d !== 31)
                    .map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {ordinal(d)} of the month
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>
                End Date{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <DatePicker
                value={form.endDate}
                onChange={(ymd) => set("endDate", ymd)}
                placeholder="No end date"
              />
            </div>
          </div>

          {/* Auto Debit — hidden in an app mode that switches it off. The stored flag is
              left untouched, so it resumes when the mode does. */}
          {autoDebitAvailable && (
          <label className="flex cursor-pointer items-center gap-3 surface border px-3 py-2.5 transition-colors hover:bg-muted/50">
            <input
              type="checkbox"
              checked={form.autoDebit}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  autoDebit: e.target.checked,
                  reminderDays: e.target.checked ? [] : prev.reminderDays,
                }));
              }}
              className="h-4 w-4 rounded accent-primary"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-none">Auto Debit</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Automatically mark as paid on the due date and deduct from the linked account.
              </p>
            </div>
          </label>
          )}

          {/* Row 5 — Reminder. Hidden when auto debit is on AND actually runs; a bill whose
              auto-debit is inert in this app mode must still be able to get a reminder,
              or the dialog would offer no notification control at all. */}
          {(!autoDebitAvailable || !form.autoDebit) && (() => {
            const isThisTheLocked = !!lockedFreeReminderBillId && editingBillId === lockedFreeReminderBillId;
            const slotLockedByOther = !!lockedFreeReminderBillId && !isThisTheLocked;

            let reminderEnabled: boolean;
            let badgeLabel: string;
            let badgeClass: string;
            let hintText: string;

            if (hasProAccess) {
              reminderEnabled = true;
              badgeLabel = "Pro / Premium";
              badgeClass = "bg-primary text-primary-foreground";
              hintText = "You have unlocked unlimited reminders with your Pro / Premium subscription.";
            } else if (slotLockedByOther) {
              reminderEnabled = false;
              badgeLabel = "Slot locked";
              badgeClass = "bg-destructive/10 text-destructive";
              hintText = "Your free reminder slot is permanently assigned to another planned expense. Upgrade to Pro for unlimited reminders.";
            } else if (isThisTheLocked) {
              reminderEnabled = true;
              badgeLabel = "Permanent";
              badgeClass = "bg-warning/10 text-warning";
              hintText = "This planned expense permanently holds your free reminder slot.";
            } else {
              const canHaveFree = (initial?.reminderDays?.length ?? 0) > 0 || freeReminderUsed === 0;
              reminderEnabled = canHaveFree;
              badgeLabel = freeReminderUsed >= 1 && !canHaveFree ? "1/1 used" : freeReminderUsed >= 1 ? "1/1 free" : "0/1 free";
              badgeClass = freeReminderUsed >= 1 && !canHaveFree ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground";
              hintText = canHaveFree
                ? "Free plan: 1 planned expense reminder. Once a reminder fires, this slot is permanently assigned to that planned expense."
                : "Free reminder slot used by another planned expense. Upgrade to Pro for unlimited reminders.";
            }

            return (
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label>Reminder (Days before)</Label>
                  <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", badgeClass)}>
                    {(isThisTheLocked || slotLockedByOther) && <Lock className="h-2.5 w-2.5" />}
                    {badgeLabel}
                  </span>
                </div>
                <div className={cn("flex flex-wrap gap-1.5", !reminderEnabled && "pointer-events-none opacity-40")}>
                  {REMINDER_OPTIONS.map(({ value, label }) => {
                    const active = form.reminderDays.includes(value);
                    const isOnDueDate = value === 0;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => reminderEnabled && toggleReminder(value)}
                        disabled={!reminderEnabled}
                        className={cn(
                          "surface border px-2 py-2 text-xs font-medium transition-colors",
                          isOnDueDate ? "flex-none" : "flex-1",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {!hasProAccess && hintText && (
                  <p className="text-[11px] text-muted-foreground">{hintText}</p>
                )}
              </div>
            );
          })()}

          </ScrollFadeBody>
          <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3 [&_button]:h-11 [&_[data-size=icon]]:w-11">
            <div className="flex w-full gap-2">
              {editingBillId && onDelete && (
                <Button type="button" variant="ghost" size="icon" className="flex-none text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete} disabled={isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className={cn("flex gap-2", editingBillId ? "flex-1 justify-end" : "w-full")}>
                <Button type="button" variant="outline" className={editingBillId ? "flex-1" : "w-1/2"} onClick={onClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" className={editingBillId ? "flex-1" : "w-1/2"} disabled={!isValid || isPending}>
                  {isPending ? "Saving…" : editingBillId ? "Save changes" : "Add planned expense"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
    </FormPanel>
  );
}

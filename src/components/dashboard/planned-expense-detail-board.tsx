"use client";

import { useAppMode } from "@/hooks/use-app-mode";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Car,
  CalendarClock,
  CheckCircle2,
  Circle,
  Pencil,
  PiggyBank,
  Trash2,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentHeader } from "@/components/app/content-header";
import { BackLink } from "@/components/app/back-link";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import {
  PlannedExpenseFormDialog,
  billToForm,
  reminderDaysToPersist,
  type BillFormState,
} from "@/components/dashboard/planned-expense-form-dialog";
import {
  deleteBill,
  markBillPaid,
  toggleBillPayment,
  unmarkBillPaid,
  updateBill,
  type BillRow,
} from "@/actions/bills";
import { PartialPaymentDialog } from "@/components/dashboard/partial-payment-dialog";
import {
  billsDataQueryOptions,
  billPaymentsHistoryQueryOptions,
  invalidateBillPaymentsHistory,
} from "@/lib/query/bills";
import { accountsQueryOptions } from "@/lib/query/accounts";
import { categoriesQueryOptions } from "@/lib/query/categories";
import { vehiclesQueryOptions, buildVehicleColorMap } from "@/lib/query/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import {
  effectiveDueDateInPaidMonth,
  getDueDayOfMonthFromYmd,
  parseYmToYearMonth,
} from "@/lib/expense-due-date";
import { labelForVehicleExpenseCategory } from "@/lib/constants/vehicle-categories";
import { formatCurrency, cn } from "@/lib/utils";
import { TAILWIND_DOT_COLORS } from "@/lib/constants/tailwind-dot-colors";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const BILLING_PERIOD_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function getCategoryDotColor(bgClass: string): string {
  const match = bgClass.match(/bg-(\w+)-\d+/);
  if (!match) return "#94a3b8";
  return TAILWIND_DOT_COLORS[match[1]] ?? "#94a3b8";
}

function effectiveBillDueDate(bill: BillRow, today: Date, paidMonthYm: string): Date | null {
  const dueDay = getDueDayOfMonthFromYmd(bill.due_date);
  if (!dueDay) return null;
  const ym = parseYmToYearMonth(paidMonthYm);
  if (bill.billing_period === "yearly") {
    const dueMonth1 = bill.due_month ?? 1;
    const year = ym?.year ?? today.getFullYear();
    const lastDay = new Date(year, dueMonth1, 0).getDate();
    return new Date(year, dueMonth1 - 1, Math.min(dueDay, lastDay));
  }
  if (bill.billing_period === "quarterly") {
    const qStartMonth = ym
      ? Math.floor((ym.month1to12 - 1) / 3) * 3
      : Math.floor(today.getMonth() / 3) * 3;
    const year = ym?.year ?? today.getFullYear();
    const lastDay = new Date(year, qStartMonth + 1, 0).getDate();
    return new Date(year, qStartMonth, Math.min(dueDay, lastDay));
  }
  return effectiveDueDateInPaidMonth(bill.due_date, paidMonthYm);
}

function formatPaidMonthLabel(ym: string): string {
  const parsed = parseYmToYearMonth(ym);
  if (!parsed) return ym;
  return `${MONTH_NAMES[parsed.month1to12 - 1]} ${parsed.year}`;
}

function formatPaidAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export function PlannedExpenseDetailBoard({ bill: initialBill }: { bill: BillRow }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isFeatureEnabled, isResolved } = useAppMode();
  const accountsEnabled = isFeatureEnabled("accounts");
  const autoDebitAvailable = isFeatureEnabled("autoDebit");
  /** Auto-debit only truly runs once the stored mode has loaded and allows it. */
  const autoDebitRuns = isResolved && autoDebitAvailable;
  const [isPending, startTransition] = useTransition();
  const [bill, setBill] = useState<BillRow>(initialBill);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [partialOpen, setPartialOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paidMonth = getCurrentPaidMonth();

  const { data: billsData } = useSuspenseQuery(billsDataQueryOptions(paidMonth));
  const { data: history = [], refetch: refetchHistory } = useQuery({
    ...billPaymentsHistoryQueryOptions(bill.id),
    select: (d) => d.history,
  });
  const { data: accounts } = useSuspenseQuery(accountsQueryOptions());
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const { data: vehicles } = useSuspenseQuery(vehiclesQueryOptions());
  const vehicleColorMap = useMemo(() => buildVehicleColorMap(vehicles), [vehicles]);

  const cat = categories.find((c) => c.id === bill.category_id);
  const account = bill.account_id ? accounts.find((a) => a.id === bill.account_id) : null;
  const vehicle = bill.vehicle_id ? vehicles.find((v) => v.id === bill.vehicle_id) : null;
  const vehicleColor = vehicle ? (vehicleColorMap[vehicle.id] ?? "#6b7280") : null;
  const dotColor = getCategoryDotColor(cat?.bgClass ?? "");

  const amountPaidThisMonth = useMemo(
    () => billsData?.paymentAmountByBillId?.[bill.id] ?? 0,
    [billsData?.paymentAmountByBillId, bill.id],
  );
  const hasAnyPaymentThisMonth = amountPaidThisMonth > 0;
  const isFullyPaidThisMonth = amountPaidThisMonth >= bill.amount;
  const isPartiallyPaidThisMonth = hasAnyPaymentThisMonth && !isFullyPaidThisMonth;
  const remainingThisMonth = Math.max(0, bill.amount - amountPaidThisMonth);
  const isFailedThisMonth = useMemo(
    () => !hasAnyPaymentThisMonth && (billsData?.failedBillIds ?? []).includes(bill.id),
    [billsData?.failedBillIds, bill.id, hasAnyPaymentThisMonth],
  );
  const failureReasonThisMonth = isFailedThisMonth
    ? billsData?.failureReasonByBillId?.[bill.id] ?? null
    : null;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const dueThisMonth = useMemo(
    () => effectiveBillDueDate(bill, today, paidMonth),
    [bill, today, paidMonth],
  );
  const isOverdue = !hasAnyPaymentThisMonth && !isFailedThisMonth && !!dueThisMonth && dueThisMonth < today;
  const isUpcoming = !hasAnyPaymentThisMonth && !isFailedThisMonth && !!dueThisMonth && dueThisMonth > today;

  const dueDayOfMonth = getDueDayOfMonthFromYmd(bill.due_date);
  const dueLabel = useMemo(() => {
    if (!dueDayOfMonth) return "—";
    if (bill.billing_period === "yearly") {
      const m = MONTH_NAMES[(bill.due_month ?? 1) - 1] ?? "";
      return `${m} ${ordinal(dueDayOfMonth)}, every year`;
    }
    if (bill.billing_period === "quarterly") {
      return `${ordinal(dueDayOfMonth)} of every quarter (Jan/Apr/Jul/Oct)`;
    }
    return `${ordinal(dueDayOfMonth)} of every month`;
  }, [bill.billing_period, bill.due_month, dueDayOfMonth]);

  const reminderLabel = bill.reminder_days_before?.length
    ? bill.reminder_days_before.map((d) => (d === 0 ? "Due date" : `${d}d before`)).join(", ")
    : null;

  function refreshAfterToggle() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.billData(paidMonth) });
    invalidateBillPaymentsHistory(queryClient, bill.id);
    void refetchHistory();
  }

  function handleToggleThisMonth() {
    setError(null);
    startTransition(async () => {
      const res = await toggleBillPayment(bill.id, paidMonth);
      if (res.error === "insufficient_balance" && res.insufficientBalance) {
        const acct = accounts.find((a) => a.id === res.insufficientBalance!.accountId);
        setError(
          `${acct?.account_alias ?? "This account"} has ${formatCurrency(res.insufficientBalance.available)} available, but this bill needs ${formatCurrency(res.insufficientBalance.required)}.`,
        );
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      refreshAfterToggle();
    });
  }

  function handlePartialSubmit(absoluteAmount: number) {
    setError(null);
    startTransition(async () => {
      const res = await markBillPaid(bill.id, paidMonth, absoluteAmount);
      if (res.error === "insufficient_balance" && res.insufficientBalance) {
        const acct = accounts.find((a) => a.id === res.insufficientBalance!.accountId);
        setError(
          `${acct?.account_alias ?? "This account"} has ${formatCurrency(res.insufficientBalance.available)} available, but this payment needs ${formatCurrency(res.insufficientBalance.required)} more.`,
        );
        return;
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      setPartialOpen(false);
      refreshAfterToggle();
    });
  }

  function handleUnmarkMonth(historyMonth: string) {
    setError(null);
    startTransition(async () => {
      // Use unmarkBillPaid (not toggleBillPayment) so failed-row entries are
      // also removed instead of being flipped to paid by the toggle.
      const res = await unmarkBillPaid(bill.id, historyMonth);
      if (res.error) {
        setError(res.error);
        return;
      }
      refreshAfterToggle();
    });
  }

  const freeReminderUsed = useMemo(
    () =>
      (billsData?.bills ?? []).filter(
        (b) => b.reminder_days_before && b.reminder_days_before.length > 0,
      ).length,
    [billsData?.bills],
  );

  function handleEditSave(form: BillFormState) {
    setError(null);
    startTransition(async () => {
      const dueDateYmd = `1970-01-${form.dueDate.padStart(2, "0")}`;
      const res = await updateBill(
        bill.id,
        form.categoryId,
        parseFloat(form.amount),
        form.note,
        dueDateYmd,
        form.billingPeriod,
        form.billingPeriod === "yearly" ? parseInt(form.dueMonth, 10) : undefined,
        undefined,
        reminderDaysToPersist(form, autoDebitAvailable),
        "both",
        form.endDate || undefined,
        form.accountId || null,
        form.vehicleId || null,
        form.vehicleCategory || null,
        form.autoDebit,
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      // Optimistic local update so the detail page reflects the change immediately.
      setBill((prev) => ({
        ...prev,
        category_id: form.categoryId,
        amount: parseFloat(form.amount),
        note: form.note,
        due_date: dueDateYmd,
        end_date: form.endDate || null,
        billing_period: form.billingPeriod,
        due_month: form.billingPeriod === "yearly" ? parseInt(form.dueMonth, 10) : undefined,
        reminder_days_before: reminderDaysToPersist(form, autoDebitAvailable) ?? null,
        reminder_channel: "both",
        account_id: form.accountId || undefined,
        vehicle_id: form.vehicleId || null,
        vehicle_category: form.vehicleCategory || null,
        // Mirror what the server actually does: it OMITS the column when the mode does
        // not offer the toggle, so the stored flag is preserved rather than cleared.
        is_auto_debit: autoDebitAvailable ? form.autoDebit : prev.is_auto_debit,
      }));
      setEditOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.billData(paidMonth) });
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteBill(bill.id);
      if (res.error) {
        setError(res.error);
        setDeleteOpen(false);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.billData(paidMonth) });
      router.push("/dashboard/bills");
    });
  }

  const statusBadge = isFullyPaidThisMonth ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
      <CheckCircle2 className="h-3 w-3" /> Paid this month
    </span>
  ) : isPartiallyPaidThisMonth ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
      Partial • {formatCurrency(amountPaidThisMonth)} / {formatCurrency(bill.amount)}
    </span>
  ) : isFailedThisMonth ? (
    <span
      className="inline-flex rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive"
      title={failureReasonThisMonth ?? "Auto-debit did not go through."}
    >
      Failed
    </span>
  ) : isOverdue ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
      Overdue
    </span>
  ) : isUpcoming ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      Upcoming
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      Unpaid
    </span>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <BackLink href="/dashboard/bills" label="Bills" />

      <ContentHeader
        title={
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: dotColor }}
              aria-hidden
            />
            <span className="min-w-0 truncate">{bill.note ?? cat?.label ?? "Bill"}</span>
          </span>
        }
        subtitle={`${cat?.label ?? "Uncategorized"} • ${BILLING_PERIOD_LABELS[bill.billing_period] ?? "Monthly"} recurrence`}
        actions={
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setEditOpen(true)}
              aria-label="Edit bill"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete bill"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Amount + status + Mark Paid toggle */}
      <div className="surface border bg-card px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <p className="text-3xl font-bold tabular-nums">{formatCurrency(bill.amount)}</p>
          {statusBadge}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatPaidMonthLabel(paidMonth)} •{" "}
          {dueThisMonth
            ? `Due ${dueThisMonth.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`
            : "No due date this month"}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {hasAnyPaymentThisMonth ? (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={handleToggleThisMonth}
              disabled={isPending}
            >
              <Circle className="h-4 w-4" /> Mark unpaid for this month
            </Button>
          ) : (
            <Button
              variant="default"
              className="gap-1.5"
              onClick={handleToggleThisMonth}
              disabled={isPending}
            >
              <CheckCircle2 className="h-4 w-4" /> Mark fully paid
            </Button>
          )}
          {remainingThisMonth > 0 && (
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => { setError(null); setPartialOpen(true); }}
              disabled={isPending}
            >
              <PiggyBank className="h-4 w-4" />
              {isPartiallyPaidThisMonth ? "Add to payment" : "Add partial payment…"}
            </Button>
          )}
        </div>

        {isFailedThisMonth && (
          <div
            role="status"
            className="mt-3 flex items-start gap-2 surface border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Auto-debit did not go through</p>
              {failureReasonThisMonth && (
                <p className="mt-0.5 text-xs opacity-90">{failureReasonThisMonth}</p>
              )}
              <p className="mt-0.5 text-xs opacity-90">
                It will retry on the next run, or you can mark it paid manually above.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-3 flex items-start justify-between gap-2 surface border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <p className="flex-1">{error}</p>
            <div className="flex shrink-0 gap-1">
              <Button asChild size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Link href="/dashboard/accounts">Go to Accounts</Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="surface border bg-card px-5 py-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h2>
        <DetailRow icon={<CalendarClock className="h-4 w-4" />} label="Due">
          {dueLabel}
        </DetailRow>
        {bill.end_date && (
          <DetailRow icon={<CalendarClock className="h-4 w-4" />} label="End date">
            {new Date(bill.end_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
          </DetailRow>
        )}
        {/* Accounts are off in bills mode: the stored account_id is untouched, but the
            badge linked to /dashboard/accounts, a route that mode blocks — a dead end. */}
        {accountsEnabled && (
          <DetailRow icon={<Wallet className="h-4 w-4" />} label="Account">
            {account ? (
              <Link
                href={`/dashboard/accounts/${account.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium hover:bg-muted"
                style={{ borderColor: `${account.color}55`, color: account.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: account.color }} />
                {account.account_alias}
              </Link>
            ) : (
              <span className="text-muted-foreground">Not linked</span>
            )}
          </DetailRow>
        )}
        {vehicle && (
          <DetailRow icon={<Car className="h-4 w-4" />} label="Vehicle">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${vehicleColor}22`,
                color: vehicleColor ?? undefined,
                border: `1px solid ${vehicleColor}55`,
              }}
            >
              {vehicle.name}
              {bill.vehicle_category && (
                <span className="opacity-70"> • {labelForVehicleExpenseCategory(bill.vehicle_category)}</span>
              )}
            </span>
          </DetailRow>
        )}
        {reminderLabel && (
          <DetailRow icon={<Bell className="h-4 w-4" />} label="Reminders">
            {reminderLabel}
          </DetailRow>
        )}
        {bill.is_auto_debit && (
          <DetailRow icon={<Zap className="h-4 w-4" />} label="Auto-debit">
            {autoDebitRuns
              ? "Enabled — paid automatically each due date"
              : "Still switched on for this bill, but paused in Bills & reminders mode — mark it paid yourself. Turn Full cashflow back on in Settings to resume."}
          </DetailRow>
        )}
        {bill.notes && (
          <DetailRow icon={null} label="Notes">
            <span className="whitespace-pre-wrap">{bill.notes}</span>
          </DetailRow>
        )}
      </div>

      {/* Payment history */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment history</h2>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 surface border border-dashed py-10 text-center text-muted-foreground">
            <p className="text-sm">No payments recorded yet.</p>
            <p className="max-w-md text-xs">Mark this bill paid to record a payment for the current month.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((entry) => {
              const paidAmount = entry.amount ?? bill.amount;
              const isPartialMonth = paidAmount > 0 && paidAmount < bill.amount;
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 surface border bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium">{formatPaidMonthLabel(entry.paid_month)}</span>
                      {isPartialMonth ? (
                        <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                          Partial
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Paid in full
                        </span>
                      )}
                      {accountsEnabled && entry.account_alias && (
                        <span
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: `${entry.account_color ?? "#6b7280"}22`,
                            color: entry.account_color ?? undefined,
                          }}
                        >
                          {entry.account_alias}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Paid on {formatPaidAt(entry.paid_at)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(paidAmount)}
                    </p>
                    {isPartialMonth && (
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        of {formatCurrency(bill.amount)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleUnmarkMonth(entry.paid_month)}
                    disabled={isPending}
                    aria-label={`Unmark ${formatPaidMonthLabel(entry.paid_month)} as paid`}
                    title={`Unmark ${formatPaidMonthLabel(entry.paid_month)} as paid`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editOpen && (
        <PlannedExpenseFormDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={handleEditSave}
          onDelete={() => { setEditOpen(false); setDeleteOpen(true); }}
          initial={billToForm(bill)}
          editingBillId={bill.id}
          isPending={isPending}
          accounts={accounts}
          vehicles={vehicles}
          freeReminderUsed={freeReminderUsed}
          lockedFreeReminderBillId={billsData?.lockedFreeReminderBillId}
        />
      )}

      <PartialPaymentDialog
        open={partialOpen}
        onClose={() => setPartialOpen(false)}
        billLabel={bill.note ?? cat?.label ?? "Bill"}
        billAmount={bill.amount}
        alreadyPaid={amountPaidThisMonth}
        onSubmit={handlePartialSubmit}
        isPending={isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete bill?"
        description="This permanently removes the bill and all of its payment history. Linked account transactions and expense entries are also removed."
        confirmLabel={isPending ? "Deleting…" : "Delete"}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={cn("mt-0.5 text-sm")}>{children}</div>
      </div>
    </div>
  );
}

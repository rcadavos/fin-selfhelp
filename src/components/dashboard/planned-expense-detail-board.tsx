"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Pencil, ReceiptText, Trash2 } from "lucide-react";
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
import { PartialPaymentDialog } from "@/components/dashboard/partial-payment-dialog";
import { CarryOverDialog } from "@/components/dashboard/planned-expenses/carry-over";
import { BillMonthPanel, type BillPanelError } from "@/components/dashboard/planned-expenses/bill-month-panel";
import { BillPaymentRecord } from "@/components/dashboard/planned-expenses/bill-payment-record";
import { BillPaymentHistory } from "@/components/dashboard/planned-expenses/bill-payment-history";
import { BillPaymentEditPanel } from "@/components/dashboard/planned-expenses/bill-payment-edit-panel";
import { BillPastPaymentPanel } from "@/components/dashboard/planned-expenses/bill-past-payment-panel";
import { BillDetailsCard } from "@/components/dashboard/planned-expenses/bill-details-card";
import { useAppMode } from "@/hooks/use-app-mode";
import { useUserPreferencesOptional } from "@/contexts/user-preferences-context";
import { DEFAULT_USER_PREFERENCES } from "@/lib/user-preferences";
import {
  carryOverBill,
  deleteBill,
  markBillPaid,
  recordBillPayment,
  undoBillCarryOver,
  unmarkBillPaid,
  updateBill,
  updateBillPayment,
  type BillPaymentHistoryRow,
  type BillRow,
  type ToggleBillPaymentResult,
  type UpdateBillPaymentInput,
} from "@/actions/bills";
import { billsDataQueryOptions, billPaymentsHistoryQueryOptions } from "@/lib/query/bills";
import { accountsQueryOptions, invalidateAccountQueries } from "@/lib/query/accounts";
import { categoriesQueryOptions } from "@/lib/query/categories";
import {
  buildVehicleColorMap,
  invalidateVehicleQueriesIfTransportAffected,
  vehiclesQueryOptions,
} from "@/lib/query/vehicles";
import { queryKeys } from "@/lib/query/keys";
import { invalidateNotificationQueries } from "@/lib/query/notifications";
import { getCurrentPaidMonth, paidMonthName, shiftPaidMonth } from "@/lib/paid-month";
import { buildPlannedExpenseRows } from "@/lib/planned-expenses/grouping";
import { canCarryOverBill } from "@/lib/planned-expenses/carry-over";
import {
  billDueLabel,
  buildBillHistoryMonths,
  buildBillRecord,
  pastPaymentMonths,
  summariseBillHistory,
  type BillHistoryMonth,
} from "@/lib/planned-expenses/bill-history";
import {
  BILL_CARRY_OVER_ERRORS,
  BILL_PAST_PAYMENT_MONTHS,
  BILL_PAYMENT_EDIT_ERRORS,
  BILL_RECORD_MONTHS,
} from "@/lib/constants/planned-expenses";
import { CONTENT_HEADER_ACTION_SIZE } from "@/lib/constants/content-header";
import { categoryDotColor } from "@/lib/constants/tailwind-dot-colors";
import { formatCurrency } from "@/lib/utils";

/** A recorded payment opened for editing, with what its month asked for. */
type PaymentEditTarget = { month: string; payment: BillPaymentHistoryRow; due: number };

function errorText(code: string): string {
  return BILL_PAYMENT_EDIT_ERRORS[code] ?? BILL_CARRY_OVER_ERRORS[code] ?? code;
}

/**
 * One bill's page: this month on the dark panel with what to do about it, the last
 * year at a glance, every payment it has had (each one editable), and the bill's
 * own details beside them on wide screens.
 */
export function PlannedExpenseDetailBoard({ bill: initialBill }: { bill: BillRow }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isFeatureEnabled, isResolved } = useAppMode();
  const accountsEnabled = isFeatureEnabled("accounts");
  const autoDebitAvailable = isFeatureEnabled("autoDebit");
  /** Auto-debit only truly runs once the stored mode has loaded and allows it. */
  const autoDebitRuns = isResolved && autoDebitAvailable;
  const currency = useUserPreferencesOptional()?.preferences.currency ?? DEFAULT_USER_PREFERENCES.currency;

  const [isPending, startTransition] = useTransition();
  const [bill, setBill] = useState<BillRow>(initialBill);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [partialOpen, setPartialOpen] = useState(false);
  const [carryOpen, setCarryOpen] = useState(false);
  const [carryError, setCarryError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<BillPanelError | null>(null);
  // The target outlives `paymentEditOpen` so the panel keeps its content while it slides away.
  const [paymentEdit, setPaymentEdit] = useState<PaymentEditTarget | null>(null);
  const [paymentEditOpen, setPaymentEditOpen] = useState(false);
  const [paymentEditKey, setPaymentEditKey] = useState(0);
  const [paymentEditError, setPaymentEditError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  // 0 until first opened: the panel mounts then, fresh each time from a new key.
  const [pastKey, setPastKey] = useState(0);
  const [pastError, setPastError] = useState<string | null>(null);

  const paidMonth = getCurrentPaidMonth();
  // Memoized so React Compiler treats it as frozen: it is handed on to canCarryOverBill.
  const nextMonth = useMemo(() => shiftPaidMonth(paidMonth, 1), [paidMonth]);
  const nextMonthName = nextMonth ? paidMonthName(nextMonth) : null;

  const { data: billsData } = useSuspenseQuery(billsDataQueryOptions(paidMonth));
  // Prefetched by the page, so this resolves from the hydrated cache.
  const { data: historyData } = useSuspenseQuery(billPaymentsHistoryQueryOptions(bill.id));
  const { data: accounts } = useSuspenseQuery(accountsQueryOptions());
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const { data: vehicles } = useSuspenseQuery(vehiclesQueryOptions());

  // The same row the Bills list builds for this bill, so the two always agree.
  const row = useMemo(
    () =>
      buildPlannedExpenseRows({
        bills: [bill],
        paymentAmountByBillId: billsData?.paymentAmountByBillId ?? {},
        paidAtByBillId: billsData?.paidAtByBillId,
        failedBillIds: new Set(billsData?.failedBillIds ?? []),
        carriedInByBillId: billsData?.carriedInByBillId,
        carriedOutByBillId: billsData?.carriedOutByBillId,
        paidMonth,
      })[0],
    [bill, billsData, paidMonth],
  );
  const history = useMemo(
    () => buildBillHistoryMonths(historyData.history, historyData.carryOvers, bill.amount),
    [historyData, bill.amount],
  );
  const record = useMemo(
    () => buildBillRecord(bill, history, paidMonth, BILL_RECORD_MONTHS),
    [bill, history, paidMonth],
  );
  const summary = useMemo(() => summariseBillHistory(history, record, paidMonth), [history, record, paidMonth]);
  const pastMonths = useMemo(
    () => pastPaymentMonths(bill, history, historyData.carryOvers, paidMonth, BILL_PAST_PAYMENT_MONTHS),
    [bill, history, historyData.carryOvers, paidMonth],
  );
  const thisMonthPayment = historyData.history.find((p) => p.paid_month === paidMonth) ?? null;

  const cat = categories.find((c) => c.id === bill.category_id);
  const categoryLabel = cat?.label ?? "Uncategorized";
  const billLabel = bill.note?.trim() || cat?.label || "Bill";
  const account = bill.account_id ? (accounts.find((a) => a.id === bill.account_id) ?? null) : null;
  const vehicle = bill.vehicle_id ? (vehicles.find((v) => v.id === bill.vehicle_id) ?? null) : null;
  const vehicleColor = vehicle ? (buildVehicleColorMap(vehicles)[vehicle.id] ?? "#6b7280") : null;
  const dotColor = categoryDotColor(cat?.bgClass);
  const dueLabel = billDueLabel(bill);

  const canCarryOver = canCarryOverBill({
    billingPeriod: bill.billing_period,
    endDate: bill.end_date,
    outstanding: row.outstanding,
    isCarriedOut: row.carryOut !== null,
    toMonth: nextMonth,
  });
  const failureReason = row.status === "failed" ? (billsData?.failureReasonByBillId?.[bill.id] ?? null) : null;

  const freeReminderUsed = useMemo(
    () => (billsData?.bills ?? []).filter((b) => b.reminder_days_before && b.reminder_days_before.length > 0).length,
    [billsData?.bills],
  );

  /**
   * After any payment or carry-over: every cached month of bills and this bill's
   * history (an older payment or a carry-over touches months other than this one),
   * plus the account balances, expenses and vehicles that read bill payments.
   */
  function refreshAfterPaymentChange() {
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "bills"] });
    void invalidateNotificationQueries(queryClient);
    void invalidateAccountQueries(queryClient);
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "expenses"] });
    void invalidateVehicleQueriesIfTransportAffected(queryClient, bill.category_id);
  }

  function balanceMessage(res: ToggleBillPaymentResult): string | null {
    const info = res.insufficientBalance;
    if (res.error !== "insufficient_balance" || !info) return null;
    const alias = accounts.find((a) => a.id === info.accountId)?.account_alias ?? "This account";
    return `${alias} has ${formatCurrency(info.available, currency)} available, but this payment needs ${formatCurrency(info.required, currency)}.`;
  }

  /** Runs a payment action from the month panel and reports what went wrong there. */
  function runPanelAction(action: () => Promise<ToggleBillPaymentResult>, onDone?: () => void) {
    setPanelError(null);
    startTransition(async () => {
      const res = await action();
      const balance = balanceMessage(res);
      if (balance) {
        setPanelError({ message: balance, showAccountsLink: accountsEnabled });
        return;
      }
      if (res.error) {
        setPanelError({ message: errorText(res.error), showAccountsLink: false });
        return;
      }
      onDone?.();
      refreshAfterPaymentChange();
    });
  }

  function handleCarryOver(note: string) {
    setCarryError(null);
    startTransition(async () => {
      const res = await carryOverBill(bill.id, paidMonth, note);
      if (res.error) {
        setCarryError(errorText(res.error));
        return;
      }
      setCarryOpen(false);
      refreshAfterPaymentChange();
    });
  }

  function openPaymentEdit(target: PaymentEditTarget) {
    setPaymentEditError(null);
    setPaymentEdit(target);
    setPaymentEditKey((k) => k + 1);
    setPaymentEditOpen(true);
  }

  function handleEditHistoryEntry(entry: BillHistoryMonth) {
    if (entry.payment) openPaymentEdit({ month: entry.month, payment: entry.payment, due: entry.due });
  }

  function handleEditThisMonth() {
    if (thisMonthPayment) openPaymentEdit({ month: paidMonth, payment: thisMonthPayment, due: row.amountDue });
  }

  function handleSavePayment(input: UpdateBillPaymentInput) {
    if (!paymentEdit) return;
    const { payment } = paymentEdit;
    setPaymentEditError(null);
    startTransition(async () => {
      const res = await updateBillPayment(payment.id, input);
      const balance = balanceMessage(res);
      if (balance || res.error) {
        setPaymentEditError(balance ?? errorText(res.error!));
        return;
      }
      setPaymentEditOpen(false);
      refreshAfterPaymentChange();
    });
  }

  function openPastPayment() {
    setPastError(null);
    setPastKey((k) => k + 1);
    setPastOpen(true);
  }

  function handleRecordPastPayment(month: string, input: UpdateBillPaymentInput) {
    setPastError(null);
    startTransition(async () => {
      const res = await recordBillPayment(bill.id, month, input);
      const balance = balanceMessage(res);
      if (balance || res.error) {
        setPastError(balance ?? errorText(res.error!));
        return;
      }
      setPastOpen(false);
      refreshAfterPaymentChange();
    });
  }

  function handleRemovePayment() {
    if (!paymentEdit) return;
    const { month } = paymentEdit;
    setPaymentEditError(null);
    startTransition(async () => {
      const res = await unmarkBillPaid(bill.id, month);
      if (res.error) {
        setPaymentEditError(errorText(res.error));
        return;
      }
      setPaymentEditOpen(false);
      refreshAfterPaymentChange();
    });
  }

  function handleEditSave(form: BillFormState) {
    setPanelError(null);
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
        form.notes,
        reminderDaysToPersist(form, autoDebitAvailable),
        "both",
        form.endDate || undefined,
        form.accountId || null,
        form.vehicleId || null,
        form.vehicleCategory || null,
        form.autoDebit,
      );
      if (res.error) {
        setPanelError({ message: res.error, showAccountsLink: false });
        return;
      }
      const previousCategoryId = bill.category_id;
      // Optimistic local update so the page reflects the change immediately.
      setBill((prev) => ({
        ...prev,
        category_id: form.categoryId,
        amount: parseFloat(form.amount),
        note: form.note,
        notes: form.notes.trim() || undefined,
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
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "bills"] });
      void invalidateVehicleQueriesIfTransportAffected(queryClient, previousCategoryId, form.categoryId);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteBill(bill.id);
      if (res.error) {
        setPanelError({ message: res.error, showAccountsLink: false });
        setDeleteOpen(false);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.billData(paidMonth) });
      router.push("/dashboard/bills");
    });
  }

  const removeMonthName = paymentEdit ? paidMonthName(paymentEdit.month) : "";
  const removeAccount = accountsEnabled ? paymentEdit?.payment.account_alias : null;

  return (
    <div className="container mx-auto max-w-3xl space-y-4 px-4 py-6 lg:max-w-6xl">
      <BackLink href="/dashboard/bills" label="Bills" />

      <ContentHeader
        title={
          <span className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${dotColor}1f`, color: dotColor }}
            >
              <ReceiptText className="size-5" />
            </span>
            <span className="min-w-0 truncate">{billLabel}</span>
          </span>
        }
        subtitle={dueLabel ? `${categoryLabel} • Due ${dueLabel}` : categoryLabel}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size={CONTENT_HEADER_ACTION_SIZE.icon}
              variant="outline"
              onClick={() => setEditOpen(true)}
              disabled={isPending}
              aria-label="Edit bill"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size={CONTENT_HEADER_ACTION_SIZE.icon}
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={isPending}
              aria-label="Delete bill"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          <BillMonthPanel
            row={row}
            monthLabel={`${paidMonthName(paidMonth)} ${paidMonth.slice(0, 4)}`}
            payment={thisMonthPayment}
            showAccount={accountsEnabled}
            currency={currency}
            failureReason={failureReason}
            carryTargetLabel={canCarryOver ? nextMonthName : null}
            isPending={isPending}
            error={panelError}
            onDismissError={() => setPanelError(null)}
            onMarkPaid={() => runPanelAction(() => markBillPaid(bill.id, paidMonth))}
            onPartialPayment={() => {
              setPanelError(null);
              setPartialOpen(true);
            }}
            onCarryOver={() => {
              setPanelError(null);
              setCarryError(null);
              setCarryOpen(true);
            }}
            onUndoCarryOver={() => runPanelAction(() => undoBillCarryOver(bill.id, paidMonth))}
            onEditPayment={handleEditThisMonth}
            onMarkUnpaid={() => runPanelAction(() => unmarkBillPaid(bill.id, paidMonth))}
          />

          {history.length > 0 && (
            <BillPaymentRecord record={record} summary={summary} currentMonth={paidMonth} currency={currency} />
          )}

          <BillPaymentHistory
            months={history}
            currentMonth={paidMonth}
            currency={currency}
            showAccounts={accountsEnabled}
            isPending={isPending}
            onEdit={handleEditHistoryEntry}
            onUndoCarryOver={(month) => runPanelAction(() => undoBillCarryOver(bill.id, month))}
            onRecordPast={pastMonths.length > 0 ? openPastPayment : undefined}
          />
        </div>

        <aside aria-label={`About ${billLabel}`} className="flex min-w-0 flex-col gap-4">
          <BillDetailsCard
            bill={bill}
            categoryLabel={categoryLabel}
            account={account}
            showAccount={accountsEnabled}
            vehicle={vehicle}
            vehicleColor={vehicleColor}
            autoDebitRuns={autoDebitRuns}
            currency={currency}
            onEdit={() => setEditOpen(true)}
          />
        </aside>
      </div>

      {editOpen && (
        <PlannedExpenseFormDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={handleEditSave}
          onDelete={() => {
            setEditOpen(false);
            setDeleteOpen(true);
          }}
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
        billLabel={billLabel}
        billAmount={row.amountDue}
        alreadyPaid={row.amountPaid}
        onSubmit={(absolute) =>
          runPanelAction(() => markBillPaid(bill.id, paidMonth, absolute), () => setPartialOpen(false))
        }
        isPending={isPending}
        currency={currency}
      />

      {nextMonth && (
        <CarryOverDialog
          open={carryOpen}
          onClose={() => setCarryOpen(false)}
          billLabel={billLabel}
          billAmount={bill.amount}
          outstanding={row.outstanding}
          fromMonth={paidMonth}
          toMonth={nextMonth}
          currency={currency}
          onSubmit={handleCarryOver}
          isPending={isPending}
          error={carryError}
        />
      )}

      {paymentEdit && (
        <BillPaymentEditPanel
          key={paymentEditKey}
          open={paymentEditOpen}
          billLabel={billLabel}
          month={paymentEdit.month}
          payment={paymentEdit.payment}
          due={paymentEdit.due}
          accounts={accounts}
          showAccounts={accountsEnabled}
          currency={currency}
          isPending={isPending}
          error={paymentEditError}
          onClose={() => setPaymentEditOpen(false)}
          onSave={handleSavePayment}
          onRemove={() => setRemoveOpen(true)}
        />
      )}

      {pastKey > 0 && (
        <BillPastPaymentPanel
          key={pastKey}
          open={pastOpen}
          billLabel={billLabel}
          months={pastMonths}
          dueDateYmd={bill.due_date}
          defaultAccountId={account?.id ?? ""}
          accounts={accounts}
          showAccounts={accountsEnabled}
          currency={currency}
          isPending={isPending}
          error={pastError}
          onClose={() => setPastOpen(false)}
          onSave={handleRecordPastPayment}
        />
      )}

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={`Remove the ${removeMonthName} payment?`}
        description={
          paymentEdit
            ? `${formatCurrency(paymentEdit.payment.amount, currency)} comes off this bill's history${
                removeAccount ? ` and goes back into ${removeAccount}` : ""
              }. ${removeMonthName} shows as unpaid again.`
            : undefined
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemovePayment}
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

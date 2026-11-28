"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/ui/amount-input";
import { DatePicker } from "@/components/ui/date-picker";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormPanel } from "@/components/app/form-panel";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { AccountSelect } from "@/components/app/account-select";
import { Amount } from "@/components/passbook/amount";
import { formatYmdLocal } from "@/lib/expense-due-date";
import { paidMonthName } from "@/lib/paid-month";
import { roundMoney } from "@/lib/planned-expenses/carry-over";
import { paymentAmountHint } from "@/lib/planned-expenses/bill-history";
import { PAYMENT_AMOUNT_HINT_TONE } from "@/lib/constants/planned-expenses";
import { cn, formatCurrency } from "@/lib/utils";
import type { AccountRow } from "@/actions/accounts";
import type { BillPaymentHistoryRow, UpdateBillPaymentInput } from "@/actions/bills";

/** The payment's local calendar day, or today's if its timestamp will not parse. */
function localYmd(iso: string): string {
  const d = new Date(iso);
  return formatYmdLocal(Number.isNaN(d.getTime()) ? new Date() : d);
}

/** `ymd` at the original payment's time of day, so moving the date keeps the order within a day. */
function paidAtOn(ymd: string, originalIso: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const original = new Date(originalIso);
  const keepTime = !Number.isNaN(original.getTime());
  return new Date(
    y,
    m - 1,
    d,
    keepTime ? original.getHours() : 12,
    keepTime ? original.getMinutes() : 0,
    keepTime ? original.getSeconds() : 0,
  ).toISOString();
}

/**
 * Correct a payment already in the bill's history: how much, the day it was paid,
 * and the account it came out of (when accounts are on). Removing it lives here
 * too, behind the bin, for a payment that should never have been recorded.
 *
 * Reads nothing after it mounts; give it a new `key` each time it opens.
 */
export function BillPaymentEditPanel({
  open,
  billLabel,
  month,
  payment,
  due,
  accounts,
  showAccounts,
  currency,
  isPending,
  error,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean;
  billLabel: string;
  /** YYYY-MM the payment belongs to. */
  month: string;
  payment: BillPaymentHistoryRow;
  /** What the bill asked for that month, carry-in included. */
  due: number;
  accounts: AccountRow[];
  /** Offer the account; off when accounts are switched off. */
  showAccounts: boolean;
  currency: string;
  isPending: boolean;
  /** A save error from the server, shown above the buttons. */
  error: string | null;
  onClose: () => void;
  onSave: (input: UpdateBillPaymentInput) => void;
  onRemove: () => void;
}) {
  const [today] = useState(() => formatYmdLocal(new Date()));
  const [originalDate] = useState(() => localYmd(payment.paid_at));
  const originalAccountId = payment.account_id ?? "";
  const [amount, setAmount] = useState(String(payment.amount));
  const [date, setDate] = useState(originalDate);
  const [accountId, setAccountId] = useState(originalAccountId);

  const monthName = paidMonthName(month);
  const amountNum = roundMoney(Number(amount));
  const amountValid = amount.trim() !== "" && Number.isFinite(amountNum) && amountNum > 0;
  const dateProblem = date > today ? "Pick today or an earlier date." : null;
  const accountChanged = showAccounts && accountId !== originalAccountId;
  const changed = amountNum !== payment.amount || date !== originalDate || accountChanged;
  const canSave = amountValid && !!date && !dateProblem && changed && !isPending;
  const shownError = dateProblem ?? error;

  const aliasOf = (id: string) =>
    accounts.find((a) => a.id === id)?.account_alias ??
    (id === originalAccountId ? payment.account_alias : null) ??
    "that account";

  const amountHint = amountValid ? paymentAmountHint(amountNum, due, monthName, currency) : null;

  const amountText = formatCurrency(amountValid ? amountNum : payment.amount, currency);
  const accountHint = !accountChanged
    ? null
    : originalAccountId && accountId
      ? `${amountText} moves from ${aliasOf(originalAccountId)} to ${aliasOf(accountId)}.`
      : originalAccountId
        ? `${amountText} goes back into ${aliasOf(originalAccountId)}, and no account pays for it.`
        : `${amountText} comes out of ${aliasOf(accountId)}.`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      amount: amountNum,
      ...(date !== originalDate ? { paidAt: paidAtOn(date, payment.paid_at) } : {}),
      ...(accountChanged ? { accountId: accountId || null } : {}),
    });
  }

  return (
    <FormPanel open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogHeader className="flex-shrink-0 px-6 pb-2 pt-6">
        <DialogTitle>Edit payment</DialogTitle>
        <DialogDescription className="truncate">
          {billLabel} <span aria-hidden>•</span> {monthName} {month.slice(0, 4)}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollFadeBody className="space-y-5 px-6 pb-4">
          <div className="grid gap-1.5">
            <Label htmlFor="bill-payment-amount">
              Amount paid <span className="text-destructive">*</span>
            </Label>
            <AmountInput
              id="bill-payment-amount"
              value={amount}
              onChange={setAmount}
              placeholder="e.g. 1,500"
              required
            />
            {amountHint && (
              <p className={cn("text-[12px]", PAYMENT_AMOUNT_HINT_TONE[amountHint.tone])}>{amountHint.text}</p>
            )}
            {amountValid && amountNum !== due && (
              <div>
                <button
                  type="button"
                  onClick={() => setAmount(String(due))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[12.5px] transition-colors hover:border-primary/40 hover:text-primary"
                >
                  Full amount
                  <Amount value={due} currency={currency} className="text-[11.5px] text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="bill-payment-date">
              Date paid <span className="text-destructive">*</span>
            </Label>
            <DatePicker id="bill-payment-date" value={date} onChange={setDate} />
          </div>

          {showAccounts && (
            <div className="grid gap-1.5">
              <Label htmlFor="bill-payment-account">Paid from</Label>
              <AccountSelect
                id="bill-payment-account"
                accounts={accounts}
                value={accountId}
                onChange={setAccountId}
                placeholder="No account"
                allowClear
              />
              <p className="text-[12px] text-muted-foreground">
                {accountHint ?? "The account this payment came out of. Its balance follows any change you make here."}
              </p>
            </div>
          )}
        </ScrollFadeBody>

        {shownError && (
          <p role="alert" className="mx-6 mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {shownError}
          </p>
        )}

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3 [&_button]:h-11">
          <div className="flex w-full items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-11 flex-none rounded-full text-destructive hover:bg-destructive/15 hover:text-destructive"
              aria-label={`Remove the ${monthName} payment`}
              title="Remove this payment"
              onClick={onRemove}
              disabled={isPending}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSave}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </FormPanel>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/ui/amount-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormPanel } from "@/components/app/form-panel";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { AccountSelect } from "@/components/app/account-select";
import { Amount } from "@/components/passbook/amount";
import { formatYmdLocal } from "@/lib/expense-due-date";
import { paidMonthName } from "@/lib/paid-month";
import { roundMoney } from "@/lib/planned-expenses/carry-over";
import {
  dueDateInMonth,
  paymentAmountHint,
  type PastPaymentMonth,
} from "@/lib/planned-expenses/bill-history";
import { PAYMENT_AMOUNT_HINT_TONE } from "@/lib/constants/planned-expenses";
import { cn, formatCurrency } from "@/lib/utils";
import type { AccountRow } from "@/actions/accounts";
import type { UpdateBillPaymentInput } from "@/actions/bills";

function monthLabel(month: string): string {
  return `${paidMonthName(month)} ${month.slice(0, 4)}`;
}

/** Today keeps the time it is now; any other day is stored at local noon, clear of midnight on either side. */
function paidAtFor(ymd: string, todayYmd: string): string {
  if (ymd === todayYmd) return new Date().toISOString();
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toISOString();
}

/**
 * Record a payment for an earlier month that never got one, such as a bill paid in
 * real life but not marked paid here: which month, how much, the day it was paid
 * and the account it came out of. Picking a month fills in what that month asked
 * for and the bill's due day in it, both still yours to change.
 *
 * Reads nothing after it mounts; give it a new `key` each time it opens.
 */
export function BillPastPaymentPanel({
  open,
  billLabel,
  months,
  dueDateYmd,
  defaultAccountId,
  accounts,
  showAccounts,
  currency,
  isPending,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  billLabel: string;
  /** Months that can take a payment, newest first; the first is picked to start with. */
  months: PastPaymentMonth[];
  /** The bill's `due_date`, for the day the date starts on. */
  dueDateYmd: string;
  /** The bill's own account, or "" for none. */
  defaultAccountId: string;
  accounts: AccountRow[];
  /** Offer the account; off when accounts are switched off. */
  showAccounts: boolean;
  currency: string;
  isPending: boolean;
  /** A save error from the server, shown above the buttons. */
  error: string | null;
  onClose: () => void;
  onSave: (month: string, input: UpdateBillPaymentInput) => void;
}) {
  const [today] = useState(() => formatYmdLocal(new Date()));
  const startDate = (month: string) => {
    const due = dueDateInMonth(dueDateYmd, month);
    return due > today ? today : due;
  };
  const first = months[0] ?? null;
  const [month, setMonth] = useState(first?.month ?? "");
  const [amount, setAmount] = useState(first ? String(first.due) : "");
  const [date, setDate] = useState(first ? startDate(first.month) : today);
  const [accountId, setAccountId] = useState(defaultAccountId);

  const due = months.find((m) => m.month === month)?.due ?? 0;
  const monthName = month ? paidMonthName(month) : "";
  const amountNum = roundMoney(Number(amount));
  const amountValid = amount.trim() !== "" && Number.isFinite(amountNum) && amountNum > 0;
  const dateProblem = date > today ? "Pick today or an earlier date." : null;
  const canSave = !!month && amountValid && !!date && !dateProblem && !isPending;
  const shownError = dateProblem ?? error;
  const amountHint = amountValid && month ? paymentAmountHint(amountNum, due, monthName, currency) : null;

  const alias = accounts.find((a) => a.id === accountId)?.account_alias;
  const accountHint = alias
    ? `${formatCurrency(amountValid ? amountNum : due, currency)} comes out of ${alias}.`
    : "No account is charged for it.";

  function pickMonth(next: string) {
    const picked = months.find((m) => m.month === next);
    if (!picked) return;
    setMonth(next);
    setAmount(String(picked.due));
    setDate(startDate(next));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onSave(month, {
      amount: amountNum,
      paidAt: paidAtFor(date, today),
      ...(showAccounts ? { accountId: accountId || null } : {}),
    });
  }

  return (
    <FormPanel open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogHeader className="flex-shrink-0 px-6 pb-2 pt-6">
        <DialogTitle>Record a past payment</DialogTitle>
        <DialogDescription className="truncate">{billLabel}</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollFadeBody className="space-y-5 px-6 pb-4">
          <div className="grid gap-1.5">
            <Label htmlFor="past-payment-month">
              Month <span className="text-destructive">*</span>
            </Label>
            <Select value={month} onValueChange={pickMonth}>
              <SelectTrigger id="past-payment-month">
                <SelectValue placeholder="Pick a month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.month} value={m.month}>
                    {monthLabel(m.month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[12px] text-muted-foreground">Only months with nothing paid and nothing carried over are listed.</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="past-payment-amount">
              Amount paid <span className="text-destructive">*</span>
            </Label>
            <AmountInput
              id="past-payment-amount"
              value={amount}
              onChange={setAmount}
              placeholder="e.g. 1,500"
              required
            />
            {amountHint && (
              <p className={cn("text-[12px]", PAYMENT_AMOUNT_HINT_TONE[amountHint.tone])}>{amountHint.text}</p>
            )}
            {amountValid && month && amountNum !== due && (
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
            <Label htmlFor="past-payment-date">
              Date paid <span className="text-destructive">*</span>
            </Label>
            <DatePicker id="past-payment-date" value={date} onChange={setDate} />
          </div>

          {showAccounts && (
            <div className="grid gap-1.5">
              <Label htmlFor="past-payment-account">Paid from</Label>
              <AccountSelect
                id="past-payment-account"
                accounts={accounts}
                value={accountId}
                onChange={setAccountId}
                placeholder="No account"
                allowClear
              />
              <p className="text-[12px] text-muted-foreground">{accountHint}</p>
            </div>
          )}
        </ScrollFadeBody>

        {shownError && (
          <p role="alert" className="mx-6 mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {shownError}
          </p>
        )}

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3 [&_button]:h-11">
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSave}>
              {isPending ? "Saving…" : "Record payment"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </FormPanel>
  );
}

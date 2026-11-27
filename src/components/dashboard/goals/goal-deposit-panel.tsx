"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/ui/amount-input";
import { DatePicker } from "@/components/ui/date-picker";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormPanel } from "@/components/app/form-panel";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { Amount } from "@/components/passbook/amount";
import { formatYmdLocal } from "@/lib/expense-due-date";
import { formatCurrency } from "@/lib/utils";

export type GoalDepositInput = { amount: number; deposited_at: string; note: string | null };

/**
 * Add money to a goal: how much, when, and an optional note. With a target, a
 * one-tap chip fills in exactly what is left, for the deposit that finishes it.
 *
 * Reads nothing after it mounts; give it a new `key` each time it opens.
 */
export function GoalDepositPanel({
  open,
  goalName,
  remaining,
  currency,
  isPending,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  goalName: string;
  /** Left to reach the target, or null without one. */
  remaining: number | null;
  currency: string;
  isPending: boolean;
  /** A save error from the server, shown above the buttons. */
  error: string | null;
  onClose: () => void;
  onSave: (input: GoalDepositInput) => void;
}) {
  const [today] = useState(() => formatYmdLocal(new Date()));
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  const amountNum = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(amountNum) && amountNum > 0;
  const dateProblem = date > today ? "Pick today or an earlier date." : null;
  const canSave = amountValid && !!date && !dateProblem && !isPending;
  const shownError = dateProblem ?? error;
  const rest = remaining !== null && remaining > 0 ? Math.round(remaining * 100) / 100 : null;

  return (
    <FormPanel open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogHeader className="flex-shrink-0 px-6 pb-2 pt-6">
        <DialogTitle>Add money</DialogTitle>
        <DialogDescription className="truncate">
          {goalName}
          {rest !== null && (
            <>
              {" "}
              <span aria-hidden>•</span> {formatCurrency(rest, currency)} to go
            </>
          )}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) onSave({ amount: amountNum, deposited_at: date, note: note.trim() || null });
        }}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <ScrollFadeBody className="space-y-5 px-6 pb-4">
          <div className="grid gap-1.5">
            <Label htmlFor="deposit-amount">
              Amount <span className="text-destructive">*</span>
            </Label>
            <AmountInput
              id="deposit-amount"
              value={amount}
              onChange={setAmount}
              placeholder="e.g. 1,000"
              autoFocus
              required
            />
            {rest !== null && (
              <div>
                <button
                  type="button"
                  onClick={() => setAmount(String(rest))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[12.5px] transition-colors hover:border-primary/40 hover:text-primary"
                >
                  The rest
                  <Amount value={rest} currency={currency} className="text-[11.5px] text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="deposit-date">
              Date <span className="text-destructive">*</span>
            </Label>
            <DatePicker id="deposit-date" value={date} onChange={setDate} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="deposit-note">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="deposit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. November savings"
            />
          </div>
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
              {isPending ? "Saving…" : "Add money"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </FormPanel>
  );
}

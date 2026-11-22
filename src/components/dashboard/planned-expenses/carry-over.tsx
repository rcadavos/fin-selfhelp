"use client";

import { useState } from "react";
import { CornerDownRight, Forward } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NotesField } from "@/components/app/notes-field";
import { BILL_CARRY_OVER_NOTE_MAX_LENGTH } from "@/lib/constants/planned-expenses";
import { paidMonthName } from "@/lib/paid-month";
import { roundMoney } from "@/lib/planned-expenses/carry-over";
import { cn, formatCurrency } from "@/lib/utils";

type CarryOverDialogProps = {
  open: boolean;
  onClose: () => void;
  billLabel: string;
  /** The bill's usual monthly amount. Unchanged by the carry-over. */
  billAmount: number;
  /** Still owed this month: what moves into next month. */
  outstanding: number;
  fromMonth: string;
  toMonth: string;
  currency?: string;
  onSubmit: (note: string) => void;
  isPending: boolean;
  /** Plain-English reason the last attempt failed, shown above the buttons. */
  error?: string | null;
};

/**
 * Confirms carrying a bill's unpaid balance into next month, with an optional note.
 * It spells out both months, so it is clear that only next month grows — the bill's
 * own monthly amount stays as it is.
 */
export function CarryOverDialog({ open, onClose, isPending, ...formProps }: CarryOverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* The content unmounts while closed, so the note starts empty on every open. */}
        <CarryOverForm onClose={onClose} isPending={isPending} {...formProps} />
      </DialogContent>
    </Dialog>
  );
}

function CarryOverForm({
  onClose,
  billLabel,
  billAmount,
  outstanding,
  fromMonth,
  toMonth,
  currency,
  onSubmit,
  isPending,
  error,
}: Omit<CarryOverDialogProps, "open">) {
  const [note, setNote] = useState("");

  const fromName = paidMonthName(fromMonth);
  const toName = paidMonthName(toMonth);
  const nextMonthDue = roundMoney(billAmount + outstanding);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Carry over to {toName}?</DialogTitle>
        <p className="text-xs text-muted-foreground">{billLabel}</p>
      </DialogHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isPending) onSubmit(note);
        }}
        className="space-y-4"
      >
        <div className="surface border bg-muted/30 px-3 py-2.5 text-xs">
          <div className="flex justify-between gap-3 py-0.5">
            <span className="text-muted-foreground">Still owed in {fromName}</span>
            <span className="font-semibold tabular-nums">{formatCurrency(outstanding, currency)}</span>
          </div>
          <div className="flex justify-between gap-3 py-0.5">
            <span className="text-muted-foreground">Usual monthly amount</span>
            <span className="font-semibold tabular-nums">{formatCurrency(billAmount, currency)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3 border-t pt-1.5">
            <span className="text-muted-foreground">{toName} will ask for</span>
            <span className="font-semibold tabular-nums text-warning">
              {formatCurrency(nextMonthDue, currency)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {fromName} is marked skipped and its payments are locked until you undo this. The
          bill stays at {formatCurrency(billAmount, currency)} a month after {toName}.
        </p>

        <NotesField
          id="carry-over-note"
          label="Note"
          value={note}
          onChange={setNote}
          maxLength={BILL_CARRY_OVER_NOTE_MAX_LENGTH}
          placeholder="e.g. Short this month, paying it with next salary"
        />

        {error && (
          <p role="alert" className="surface border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" className="w-1/2" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" className="w-1/2" disabled={isPending}>
              {isPending ? "Saving…" : "Carry over"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}

/**
 * One line on a bill saying where its balance went or came from, with the
 * carry-over's note after it: "₱700 carried to Dec • Short this month".
 */
export function CarryOverNote({
  direction,
  amount,
  month,
  note,
  currency,
  className,
}: {
  /** "out": carried from this month into `month`. "in": carried into this month from `month`. */
  direction: "out" | "in";
  amount: number;
  month: string;
  note: string | null;
  currency?: string;
  className?: string;
}) {
  const Icon = direction === "out" ? Forward : CornerDownRight;
  const monthLabel = paidMonthName(month, "short");
  const text =
    direction === "out"
      ? `${formatCurrency(amount, currency)} carried to ${monthLabel}`
      : `Includes ${formatCurrency(amount, currency)} carried from ${monthLabel}`;
  return (
    <p className={cn("mt-1 flex items-start gap-1.5 text-[11.5px] text-muted-foreground", className)}>
      <Icon className="mt-0.5 size-3 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">
        {text}
        {note && (
          <>
            <span className="mx-1.5 opacity-45">•</span>
            <span className="whitespace-pre-line">{note}</span>
          </>
        )}
      </span>
    </p>
  );
}

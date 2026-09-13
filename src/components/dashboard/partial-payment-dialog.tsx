"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

export type PartialPaymentDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Display name of the bill (note or category label). */
  billLabel: string;
  /** Bill total — the target full amount. */
  billAmount: number;
  /** Amount already recorded for this month (0 if no payment row yet). */
  alreadyPaid: number;
  /** Server submit. Called with the absolute new amount_paid value, not a delta. */
  onSubmit: (absoluteAmount: number) => Promise<void> | void;
  isPending: boolean;
};

export function PartialPaymentDialog({
  open,
  onClose,
  billLabel,
  billAmount,
  alreadyPaid,
  onSubmit,
  isPending,
}: PartialPaymentDialogProps) {
  const remaining = Math.max(0, billAmount - alreadyPaid);
  // The input is "amount to add now", pre-filled with the remaining balance.
  const [addAmount, setAddAmount] = useState<string>(remaining > 0 ? String(remaining) : "");

  useEffect(() => {
    if (open) setAddAmount(remaining > 0 ? String(remaining) : "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const addNum = parseFloat(addAmount);
  const isValidAdd = !isNaN(addNum) && addNum > 0;
  const newAbsolute = isValidAdd ? alreadyPaid + addNum : alreadyPaid;
  const willOverpay = isValidAdd && newAbsolute > billAmount;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAdd || isPending) return;
    void onSubmit(newAbsolute);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {alreadyPaid > 0 ? "Add to this month's payment" : "Add partial payment"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{billLabel}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Summary block */}
          <div className="surface border bg-muted/30 px-3 py-2.5 text-xs">
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">Bill total</span>
              <span className="font-semibold tabular-nums">{formatCurrency(billAmount)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-muted-foreground">Already paid this month</span>
              <span className="font-semibold tabular-nums">{formatCurrency(alreadyPaid)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 mt-1">
              <span className="text-muted-foreground">Remaining</span>
              <span
                className={`font-semibold tabular-nums ${
                  remaining > 0 ? "text-warning" : "text-primary"
                }`}
              >
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          {/* Amount input */}
          <div className="grid gap-1.5">
            <Label htmlFor="partial-amount">Amount to pay now</Label>
            <AmountInput
              id="partial-amount"
              placeholder="0.00"
              value={addAmount}
              onChange={setAddAmount}
              autoFocus
            />
            {isValidAdd && (
              <p className="text-[11px] text-muted-foreground">
                New total paid this month:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatCurrency(newAbsolute)}
                </span>
                {willOverpay && (
                  <span className="ml-1 text-warning">
                    — exceeds the bill total by {formatCurrency(newAbsolute - billAmount)}
                  </span>
                )}
              </p>
            )}
          </div>

          <DialogFooter>
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-1/2"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-1/2" disabled={!isValidAdd || isPending}>
                {isPending ? "Saving…" : "Add payment"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

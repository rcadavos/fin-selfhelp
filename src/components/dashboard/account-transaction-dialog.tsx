"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { cn } from "@/lib/utils";

export type SimpleEntryMode = "expense" | "income" | "adjustment";

const MODE_COPY: Record<SimpleEntryMode, { title: string; cta: string; help: string }> = {
  expense:    { title: "Add Expense",    cta: "Save expense",    help: "Money out of this account." },
  income:     { title: "Add Income",     cta: "Save income",     help: "Money into this account." },
  adjustment: { title: "Adjustment",     cta: "Save adjustment", help: "Manually correct the balance up or down." },
};

export function AccountTransactionDialog({
  open,
  mode,
  onClose,
  onSave,
  isPending,
  error,
}: {
  open: boolean;
  mode: SimpleEntryMode;
  onClose: () => void;
  /** Always positive amount; for adjustment, `direction` flags +/-. */
  onSave: (input: { amount: number; description: string; direction: 1 | -1 }) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [amountText, setAmountText] = useState("");
  const [description, setDescription] = useState("");
  const [direction, setDirection] = useState<1 | -1>(1);
  const copy = MODE_COPY[mode];

  const amount = Number(amountText);
  const isValid = Number.isFinite(amount) && amount > 0;

  function handleClose() {
    setAmountText("");
    setDescription("");
    setDirection(1);
    onClose();
  }

  function handleSave() {
    if (!isValid) return;
    onSave({ amount, description: description.trim(), direction: mode === "adjustment" ? direction : 1 });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex flex-col overflow-hidden p-0 max-h-[min(90dvh,calc(100dvh-2rem))] sm:max-w-md">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>

        <ScrollFadeBody className="space-y-4 px-6 py-4">
          <p className="text-xs text-muted-foreground">{copy.help}</p>

          {mode === "adjustment" && (
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection(1)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    direction === 1
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  Add to balance
                </button>
                <button
                  type="button"
                  onClick={() => setDirection(-1)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    direction === -1
                      ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  Subtract from balance
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="acc-tx-amount">Amount</Label>
            <Input
              id="acc-tx-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-tx-desc">Description (optional)</Label>
            <Input
              id="acc-tx-desc"
              placeholder="e.g. Lunch, Salary, Bank correction"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </ScrollFadeBody>

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3">
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={!isValid || isPending}>
              {isPending ? "Saving…" : copy.cta}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AccountTransferDialog({
  open,
  fromAccountId,
  otherAccounts,
  onClose,
  onSave,
  isPending,
  error,
}: {
  open: boolean;
  fromAccountId: string;
  otherAccounts: Array<{ id: string; account_alias: string; bank_name: string; color: string }>;
  onClose: () => void;
  onSave: (input: { toAccountId: string; amount: number; description: string }) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [toAccountId, setToAccountId] = useState<string>("");
  const [amountText, setAmountText] = useState("");
  const [description, setDescription] = useState("");

  const amount = Number(amountText);
  const isValid =
    !!toAccountId &&
    toAccountId !== fromAccountId &&
    Number.isFinite(amount) &&
    amount > 0;

  function handleClose() {
    setToAccountId("");
    setAmountText("");
    setDescription("");
    onClose();
  }

  function handleSave() {
    if (!isValid) return;
    onSave({ toAccountId, amount, description: description.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex flex-col overflow-hidden p-0 max-h-[min(90dvh,calc(100dvh-2rem))] sm:max-w-md">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Transfer</DialogTitle>
        </DialogHeader>

        <ScrollFadeBody className="space-y-4 px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Move money from this account to another account. Both balances update.
          </p>

          <div className="space-y-1.5">
            <Label>Destination account</Label>
            {otherAccounts.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                You need at least one other account to transfer money. Add another account first.
              </p>
            ) : (
              <div className="grid gap-1.5">
                {otherAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setToAccountId(acc.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
                      toAccountId === acc.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: acc.color }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{acc.account_alias}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{acc.bank_name}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-transfer-amount">Amount</Label>
            <Input
              id="acc-transfer-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-transfer-desc">Description (optional)</Label>
            <Input
              id="acc-transfer-desc"
              placeholder="e.g. Top-up GCash from BDO"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </ScrollFadeBody>

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3">
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={!isValid || isPending}>
              {isPending ? "Saving…" : "Save transfer"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

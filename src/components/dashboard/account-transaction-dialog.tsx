"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { getBankLogoSlug } from "@/lib/constants/account-institutions";
import { cn, formatCurrency } from "@/lib/utils";

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

export type SimpleEntryMode = "expense" | "income" | "adjustment";

const MODE_COPY: Record<SimpleEntryMode, { title: string; cta: string; help: string }> = {
  expense: { title: "Add Expense", cta: "Save expense", help: "Money out of this account." },
  income: { title: "Add Income", cta: "Save income", help: "Money into this account." },
  adjustment: { title: "Adjustment", cta: "Save adjustment", help: "Enter the account's current balance. An adjustment entry will be recorded for the difference." },
};

export function AccountTransactionDialog({
  open,
  mode,
  currentBalance = 0,
  accounts = [],
  defaultAccountId = "",
  onClose,
  onSave,
  isPending,
  error,
}: {
  open: boolean;
  mode: SimpleEntryMode;
  currentBalance?: number;
  accounts?: Array<{ id: string; account_alias: string; bank_name: string; color: string }>;
  defaultAccountId?: string;
  onClose: () => void;
  onSave: (input: { amount: number; description: string; direction: 1 | -1; date: string; accountId: string }) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [amountText, setAmountText] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayYmd);
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId);
  const copy = MODE_COPY[mode];

  useEffect(() => {
    if (open && mode === "adjustment") {
      setAmountText(currentBalance.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const parsedAmount = Number(amountText);
  const delta = parsedAmount - currentBalance;

  const isValid =
    mode === "adjustment"
      ? amountText !== "" && Number.isFinite(parsedAmount) && parsedAmount !== currentBalance
      : Number.isFinite(parsedAmount) && parsedAmount > 0;

  function handleClose() {
    setAmountText("");
    setDescription("");
    setDate(todayYmd());
    setSelectedAccountId(defaultAccountId);
    onClose();
  }

  function handleSave() {
    if (!isValid) return;
    if (mode === "adjustment") {
      onSave({
        amount: Math.abs(delta),
        description: description.trim(),
        direction: delta >= 0 ? 1 : -1,
        date,
        accountId: defaultAccountId,
      });
    } else {
      onSave({ amount: parsedAmount, description: description.trim(), direction: 1, date, accountId: selectedAccountId });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent aria-describedby={undefined} className="flex flex-col overflow-hidden p-0 max-h-[min(90dvh,calc(100dvh-2rem))] sm:max-w-md">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{copy.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{copy.help}</p>
        </DialogHeader>

        <ScrollFadeBody className="space-y-4 px-6">
          {mode === "adjustment" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="acc-tx-amount">Current Balance</Label>
                <Input
                  id="acc-tx-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder={currentBalance.toFixed(2)}
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  autoFocus
                />
                {amountText !== "" && Number.isFinite(parsedAmount) && parsedAmount !== currentBalance && (
                  <p className={cn(
                    "text-xs font-medium",
                    delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                  )}>
                    Adjustment: {delta > 0 ? "+" : "−"}{formatCurrency(Math.abs(delta))}
                  </p>
                )}
                {amountText !== "" && Number.isFinite(parsedAmount) && parsedAmount === currentBalance && (
                  <p className="text-xs text-muted-foreground">No change from current balance.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-tx-desc">Notes (optional)</Label>
                <Input
                  id="acc-tx-desc"
                  placeholder="e.g. Bank statement reconciliation"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              {accounts.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="acc-tx-account">Account</Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger id="acc-tx-account" className="h-auto min-h-10 w-full py-2">
                      {selectedAccountId ? (
                        (() => {
                          const acc = accounts.find((a) => a.id === selectedAccountId);
                          const logoSlug = acc ? getBankLogoSlug(acc.bank_name) : null;
                          return acc ? (
                            <div className="flex min-w-0 items-center gap-2">
                              {logoSlug ? (
                                <Image src={`/images/bank-logo/${logoSlug}.webp`} alt={acc.bank_name} width={18} height={18} className="flex-shrink-0 rounded object-contain" unoptimized />
                              ) : (
                                <span className="h-[18px] w-[18px] flex-shrink-0 rounded-md" style={{ backgroundColor: acc.color }} />
                              )}
                              <span className="truncate text-sm font-medium">{acc.account_alias}</span>
                            </div>
                          ) : <SelectValue placeholder="Select account" />;
                        })()
                      ) : (
                        <SelectValue placeholder="Select account" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => {
                        const logoSlug = getBankLogoSlug(acc.bank_name);
                        return (
                          <SelectItem key={acc.id} value={acc.id} className="py-2">
                            <div className="flex min-w-0 items-center gap-2">
                              {logoSlug ? (
                                <Image src={`/images/bank-logo/${logoSlug}.webp`} alt={acc.bank_name} width={18} height={18} className="flex-shrink-0 rounded object-contain" unoptimized />
                              ) : (
                                <span className="h-[18px] w-[18px] flex-shrink-0 rounded-md" style={{ backgroundColor: acc.color }} />
                              )}
                              <span className="truncate text-sm">{acc.account_alias}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
                  placeholder="e.g. Salary, Freelance payment"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-tx-date">Date</Label>
                <DatePicker id="acc-tx-date" value={date} onChange={setDate} formatDisplay={formatShortDate} />
              </div>
            </>
          )}

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
  otherAccounts: Array<{ id: string; account_alias: string; bank_name: string; color: string; balance: number }>;
  onClose: () => void;
  onSave: (input: { toAccountId: string; amount: number; description: string; fee: number }) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [toAccountId, setToAccountId] = useState<string>("");
  const [amountText, setAmountText] = useState("");
  const [feeText, setFeeText] = useState("");
  const [description, setDescription] = useState("");

  const amount = Number(amountText);
  const fee = feeText === "" ? 0 : Number(feeText);
  const feeValid = feeText === "" || (Number.isFinite(fee) && fee >= 0);

  const isValid =
    !!toAccountId &&
    toAccountId !== fromAccountId &&
    Number.isFinite(amount) &&
    amount > 0 &&
    feeValid;

  const selectedAcc = otherAccounts.find((a) => a.id === toAccountId) ?? null;

  function handleClose() {
    setToAccountId("");
    setAmountText("");
    setFeeText("");
    setDescription("");
    onClose();
  }

  function handleSave() {
    if (!isValid) return;
    onSave({ toAccountId, amount, description: description.trim(), fee });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent aria-describedby={undefined} className="flex flex-col overflow-hidden p-0 max-h-[min(90dvh,calc(100dvh-2rem))] sm:max-w-md">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>Transfer</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Move money from this account to another account. Both balances update.
          </p>
        </DialogHeader>

        <ScrollFadeBody className="space-y-4 px-6">
          <div className="space-y-1.5">
            <Label>Destination account</Label>
            {otherAccounts.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                You need at least one other account to transfer money. Add another account first.
              </p>
            ) : (
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="h-auto min-h-10 w-full py-2">
                  {selectedAcc ? (
                    <AccountOption acc={selectedAcc} />
                  ) : (
                    <span className="text-sm text-muted-foreground">Select destination account</span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {otherAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="py-2">
                      <AccountOption acc={acc} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <Label htmlFor="acc-transfer-fee">Transfer Fee (optional)</Label>
              <Input
                id="acc-transfer-fee"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={feeText}
                onChange={(e) => setFeeText(e.target.value)}
              />
            </div>
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

function AccountOption({
  acc,
}: {
  acc: { account_alias: string; bank_name: string; color: string; balance: number };
}) {
  const logoSlug = getBankLogoSlug(acc.bank_name);
  return (
    <div className="flex min-w-0 items-center gap-2">
      {logoSlug ? (
        <Image
          src={`/images/bank-logo/${logoSlug}.webp`}
          alt={acc.bank_name}
          width={20}
          height={20}
          className="flex-shrink-0 rounded object-contain"
          unoptimized
        />
      ) : (
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: acc.color }}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight">{acc.account_alias}</span>
        <span className="block truncate text-[11px] leading-tight text-muted-foreground">
          {acc.bank_name} • {formatCurrency(acc.balance)}
        </span>
      </span>
    </div>
  );
}

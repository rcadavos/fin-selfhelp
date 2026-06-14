"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import type { AccountTransactionRow } from "@/actions/account-transactions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { AccountSelect } from "@/components/app/account-select";
import { FormPanel } from "@/components/app/form-panel";
import { addExpense } from "@/actions/budget";
import {
  createAccountExpense,
  createAccountIncome,
  createAccountAdjustment,
  createAccountTransfer,
  createAccountFee,
} from "@/actions/account-transactions";
import { categoriesQueryOptions } from "@/lib/query/categories";
import {
  accountsQueryOptions,
  accountBalancesQueryOptions,
  invalidateAccountQueries,
} from "@/lib/query/accounts";
import {
  vehiclesQueryOptions,
  invalidateVehicleQueriesIfTransportAffected,
} from "@/lib/query/vehicles";
import { accountTransactionsQueryOptions, invalidateAccountTransactions } from "@/lib/query/account-transactions";
import { queryKeys } from "@/lib/query/keys";
import { VEHICLE_EXPENSE_CATEGORIES } from "@/lib/constants/vehicle-categories";
import { cn, formatCurrency, roundToCents } from "@/lib/utils";

export type EntryTab = "expense" | "income" | "adjustment" | "transfer";

const TABS: { value: EntryTab; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "adjustment", label: "Adjustment" },
  { value: "transfer", label: "Transfer" },
];

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function AddEntryPanel({
  open,
  onClose,
  initialTab = "expense",
  accountId,
  initialCategory,
  initialVehicleId,
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: EntryTab;
  accountId?: string;
  initialCategory?: string;
  initialVehicleId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery(categoriesQueryOptions());
  const { data: accounts = [] } = useQuery(accountsQueryOptions());
  const { data: vehicles = [] } = useQuery(vehiclesQueryOptions());
  const { data: balances = {} } = useQuery(accountBalancesQueryOptions());

  const [tab, setTab] = useState<EntryTab>(initialTab);
  const { showError } = useSnackbar();
  const amountRef = useRef<HTMLInputElement>(null);

  // ── Shared account (carried across all tabs) ─────────────────────────────
  const [sharedAccountId, setSharedAccountId] = useState(accountId ?? "");

  // ── Derived: is the selected account "untracked" (not included in net balance) ──
  const selectedAccount = accounts.find((a) => a.id === sharedAccountId);
  const isUntrackedAccount = selectedAccount ? !selectedAccount.include_in_net_balance : false;

  function handleAccountChange(id: string) {
    setSharedAccountId(id);
    setAdjNewBalance(id && balances[id] !== undefined ? roundToCents(balances[id]).toFixed(2) : "");
    // Reset "show in history" whenever account changes — will only re-enable if user explicitly checks it
    setExpShowInHistory(false);
  }

  // ── Expense state ─────────────────────────────────────────────────────────
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState(initialCategory ?? "");
  const [expNote, setExpNote] = useState("");
  const [expDate, setExpDate] = useState(todayYmd);
  const [expVehicleId, setExpVehicleId] = useState(initialVehicleId ?? "");
  const [expVehicleCategory, setExpVehicleCategory] = useState("");
  const [expShowInHistory, setExpShowInHistory] = useState(false);

  // ── Income state ──────────────────────────────────────────────────────────
  const [incAmount, setIncAmount] = useState("");
  const [incDescription, setIncDescription] = useState("");
  const [incDate, setIncDate] = useState(todayYmd);

  // ── Adjustment state ──────────────────────────────────────────────────────
  const [adjNewBalance, setAdjNewBalance] = useState("");
  const [adjNotes, setAdjNotes] = useState("");

  // ── Transfer state ────────────────────────────────────────────────────────
  const [txTo, setTxTo] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txFee, setTxFee] = useState("");
  const [txDescription, setTxDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    // Wait for the Sheet animation to finish and Radix focus-trap to settle,
    // then focus the amount input and scroll it into view so it stays visible
    // above the mobile keyboard.
    const t = setTimeout(() => {
      requestAnimationFrame(() => {
        const el = amountRef.current;
        if (!el) return;
        el.focus({ preventScroll: true });
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }, 450);
    return () => clearTimeout(t);
  }, [open, tab]);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab ?? "expense");
    const defaultAccountId = accountId ?? "";
    setSharedAccountId(defaultAccountId);
    setAdjNewBalance(defaultAccountId && balances[defaultAccountId] !== undefined ? roundToCents(balances[defaultAccountId]).toFixed(2) : "");
    setExpName(""); setExpAmount(""); setExpCategory(initialCategory ?? "");
    setExpNote(""); setExpDate(todayYmd());
    setExpVehicleId(initialVehicleId ?? ""); setExpVehicleCategory(""); setExpShowInHistory(false);
    setIncAmount(""); setIncDescription(""); setIncDate(todayYmd());
    setAdjNotes("");
    setTxTo(""); setTxAmount(""); setTxFee(""); setTxDescription("");
  }, [open, initialTab, accountId, initialCategory, initialVehicleId]);

  // ── Derived values ────────────────────────────────────────────────────────
  const expParsedAmt = parseFloat(expAmount);
  const expBalance = sharedAccountId ? (balances[sharedAccountId] ?? 0) : null;
  const expInsufficient =
    !!sharedAccountId &&
    Number.isFinite(expParsedAmt) && expParsedAmt > 0 &&
    expBalance !== null && expParsedAmt > expBalance;

  const adjCurrentBalance = roundToCents(sharedAccountId ? (balances[sharedAccountId] ?? 0) : 0);
  const adjParsed = parseFloat(adjNewBalance);
  const adjDelta = Number.isFinite(adjParsed) ? roundToCents(adjParsed - adjCurrentBalance) : null;

  const txToAccounts = accounts.filter((a) => a.id !== sharedAccountId);
  const txParsedAmount = parseFloat(txAmount);
  const txParsedFee = txFee === "" ? 0 : parseFloat(txFee);

  // ── Validation ────────────────────────────────────────────────────────────
  const tabValid: Record<EntryTab, boolean> = {
    expense:
      Number.isFinite(expParsedAmt) && expParsedAmt > 0 &&
      !!sharedAccountId && !expInsufficient &&
      !!expCategory &&
      !(expVehicleId && !expVehicleCategory),
    income:
      Number.isFinite(parseFloat(incAmount)) && parseFloat(incAmount) > 0 &&
      !!sharedAccountId,
    adjustment:
      !!sharedAccountId &&
      adjNewBalance !== "" &&
      Number.isFinite(adjParsed) &&
      adjDelta !== null && adjDelta !== 0,
    transfer:
      !!sharedAccountId && !!txTo && txTo !== sharedAccountId &&
      Number.isFinite(txParsedAmount) && txParsedAmount > 0 &&
      (txFee === "" || (Number.isFinite(txParsedFee) && txParsedFee >= 0)),
  };

  // ── Submit (optimistic) ───────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tabValid[tab]) return;

    const categoryLabel = categories.find(c => c.id === expCategory)?.label ?? expCategory;
    const expDisplayName = expName.trim() || categoryLabel;

    const balancesKey = accountBalancesQueryOptions().queryKey;
    const prevBalances = queryClient.getQueryData<Record<string, number>>(balancesKey);

    // Snapshot current transaction cache for rollback
    const txKey = accountTransactionsQueryOptions(sharedAccountId).queryKey;
    const prevTx = queryClient.getQueryData<{ transactions: AccountTransactionRow[]; balance: number }>(txKey);

    // ── Optimistic balance update ─────────────────────────────────────────
    const now = new Date().toISOString();
    const tempId = `optimistic-${Date.now()}`;

    if (tab === "expense") {
      queryClient.setQueryData<Record<string, number>>(balancesKey, (old = {}) => ({
        ...old, [sharedAccountId]: (old[sharedAccountId] ?? 0) - expParsedAmt,
      }));
      queryClient.setQueryData<{ transactions: AccountTransactionRow[]; balance: number }>(txKey, (old) => {
        if (!old) return old;
        const tx: AccountTransactionRow = { id: tempId, account_id: sharedAccountId, type: "expense", amount: -expParsedAmt, description: expDisplayName, transfer_group_id: null, occurred_at: expDate + "T00:00:00", created_at: now };
        return { transactions: [tx, ...old.transactions], balance: old.balance - expParsedAmt };
      });
    } else if (tab === "income") {
      const amt = parseFloat(incAmount);
      queryClient.setQueryData<Record<string, number>>(balancesKey, (old = {}) => ({
        ...old, [sharedAccountId]: (old[sharedAccountId] ?? 0) + amt,
      }));
      queryClient.setQueryData<{ transactions: AccountTransactionRow[]; balance: number }>(txKey, (old) => {
        if (!old) return old;
        const tx: AccountTransactionRow = { id: tempId, account_id: sharedAccountId, type: "income", amount: amt, description: incDescription.trim(), transfer_group_id: null, occurred_at: incDate + "T00:00:00", created_at: now };
        return { transactions: [tx, ...old.transactions], balance: old.balance + amt };
      });
    } else if (tab === "adjustment") {
      queryClient.setQueryData<Record<string, number>>(balancesKey, (old = {}) => ({
        ...old, [sharedAccountId]: adjParsed,
      }));
      queryClient.setQueryData<{ transactions: AccountTransactionRow[]; balance: number }>(txKey, (old) => {
        if (!old) return old;
        const tx: AccountTransactionRow = { id: tempId, account_id: sharedAccountId, type: "adjustment", amount: adjDelta!, description: adjNotes.trim(), transfer_group_id: null, occurred_at: now.slice(0, 10) + "T00:00:00", created_at: now };
        return { transactions: [tx, ...old.transactions], balance: adjParsed };
      });
    } else {
      const total = txParsedAmount + (txParsedFee > 0 ? txParsedFee : 0);
      queryClient.setQueryData<Record<string, number>>(balancesKey, (old = {}) => ({
        ...old,
        [sharedAccountId]: (old[sharedAccountId] ?? 0) - total,
        [txTo]: (old[txTo] ?? 0) + txParsedAmount,
      }));
    }

    // Close + redirect immediately (optimistic)
    onClose();
    if (sharedAccountId) {
      router.push(`/dashboard/accounts/${sharedAccountId}`);
    }

    // ── Async server call ─────────────────────────────────────────────────
    void (async () => {
      let err: string | null = null;

      if (tab === "expense") {
        // For untracked accounts with "Show in expense history" unchecked, skip the global expense entry
        const addToHistory = !isUntrackedAccount || expShowInHistory;
        if (addToHistory) {
          const res = await addExpense(expCategory || "other", expParsedAmt, expDisplayName, expNote.trim() || null, expDate, sharedAccountId, expVehicleId || null, expVehicleCategory || null);
          if (res.error) { err = res.error; }
        }
        if (!err) {
          const txRes = await createAccountExpense({ accountId: sharedAccountId, amount: expParsedAmt, description: expDisplayName, occurredAt: expDate });
          if (txRes.error) err = txRes.error;
        }
        if (!err) {
          invalidateAccountQueries(queryClient);
          if (addToHistory) {
            queryClient.invalidateQueries({ queryKey: [...queryKeys.all, "expenses"] });
            invalidateVehicleQueriesIfTransportAffected(queryClient, expCategory || "other");
          }
          invalidateAccountTransactions(queryClient, sharedAccountId);
        }
      } else if (tab === "income") {
        const res = await createAccountIncome({ accountId: sharedAccountId, amount: parseFloat(incAmount), description: incDescription.trim() || undefined, occurredAt: incDate });
        if (res.error) err = res.error;
        else { invalidateAccountQueries(queryClient); invalidateAccountTransactions(queryClient, sharedAccountId); }
      } else if (tab === "adjustment") {
        const res = await createAccountAdjustment({ accountId: sharedAccountId, amount: adjDelta!, description: adjNotes.trim() || undefined });
        if (res.error) err = res.error;
        else { invalidateAccountQueries(queryClient); invalidateAccountTransactions(queryClient, sharedAccountId); }
      } else {
        const res = await createAccountTransfer({ fromAccountId: sharedAccountId, toAccountId: txTo, amount: txParsedAmount, description: txDescription.trim() || undefined });
        if (res.error) { err = res.error; }
        const transferSaved = !err;
        if (transferSaved && txParsedFee > 0) {
          const feeRes = await createAccountFee({ accountId: sharedAccountId, amount: txParsedFee, description: txDescription.trim() ? `Transfer fee — ${txDescription.trim()}` : "Transfer fee" });
          if (feeRes.error) err = feeRes.error;
        }
        // Always invalidate when the transfer itself succeeded, even if the fee failed,
        // so the UI reflects the actual DB state rather than the rolled-back optimistic value.
        if (transferSaved) {
          invalidateAccountQueries(queryClient);
          invalidateAccountTransactions(queryClient, sharedAccountId);
          invalidateAccountTransactions(queryClient, txTo);
        } else {
          // Transfer itself failed — roll back
          queryClient.setQueryData(balancesKey, prevBalances);
          queryClient.setQueryData(txKey, prevTx);
        }
        if (err) showError(err);
        return; // transfer branch handles its own err/rollback above
      }

      if (err) {
        queryClient.setQueryData(balancesKey, prevBalances);
        queryClient.setQueryData(txKey, prevTx);
        showError(err);
      }
    })();
  }

  const ctaLabel = { expense: "Add", income: "Save", adjustment: "Save", transfer: "Transfer" }[tab];

  return (
    <FormPanel open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogHeader className="hidden lg:flex flex-shrink-0 px-6 pt-6 pb-3">
        <DialogTitle>Add Entry</DialogTitle>
      </DialogHeader>

      {/* Tab bar */}
      <div className="flex-shrink-0 px-6 pb-0">
        <div className="inline-flex w-full items-center gap-0.5 rounded-md border bg-background p-0.5">
          {TABS.map((t) => (
            <Button
              key={t.value}
              type="button"
              size="sm"
              variant={tab === t.value ? "secondary" : "ghost"}
              className="h-8 flex-1 px-3 text-sm"
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollFadeBody className="space-y-4 px-6 pb-4 pt-2">

          {/* ── Expense ── */}
          {tab === "expense" && (
            <>
              {/* Amount — bottom border only, centered */}
              <div className="flex flex-col items-center gap-1 pb-2">
                <Label htmlFor="ae-amount" className="text-xs text-muted-foreground">Amount</Label>
                <input
                  id="ae-amount" type="number" inputMode="decimal" min="0.01" step="any"
                  value={expAmount} onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="₱0.00" ref={amountRef}
                  className="w-48 border-0 border-b-2 border-input bg-transparent px-0 py-1 text-center text-2xl font-bold tabular-nums placeholder:text-muted-foreground/40 outline-none focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              {accounts.length > 0 ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="ae-account">Account</Label>
                  <AccountSelect id="ae-account" accounts={accounts} value={sharedAccountId} onChange={handleAccountChange} />
                  {expInsufficient && (
                    <p className="text-xs text-destructive">
                      Insufficient balance. Available: ₱{(expBalance ?? 0).toFixed(2)}{" "}
                      <Link href="/dashboard/accounts" className="font-semibold underline underline-offset-2 hover:no-underline" onClick={onClose}>
                        Go to Accounts
                      </Link>
                    </p>
                  )}
                  {sharedAccountId && !expInsufficient && expBalance !== null && (
                    <p className="text-xs text-muted-foreground">Available: ₱{expBalance.toFixed(2)}</p>
                  )}
                </div>
              ) : (
                <p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                  No accounts found. Create an account first to track expenses.
                </p>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="ae-name">Label</Label>
                <Input id="ae-name" value={expName} onChange={(e) => setExpName(e.target.value)} placeholder="e.g. Groceries, Netflix (optional)" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="ae-category">Category</Label>
                  <Select value={expCategory} onValueChange={setExpCategory}>
                    <SelectTrigger id="ae-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ae-date">Date</Label>
                  <DatePicker id="ae-date" value={expDate} onChange={setExpDate} formatDisplay={formatShortDate} />
                </div>
              </div>

              {expCategory === "transport" && vehicles.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="ae-vehicle">Vehicle (optional)</Label>
                    <Select
                      value={expVehicleId || "_none"}
                      onValueChange={(v) => { setExpVehicleId(v === "_none" ? "" : v); setExpVehicleCategory(""); }}
                    >
                      <SelectTrigger id="ae-vehicle"><SelectValue placeholder="Link to a vehicle" /></SelectTrigger>
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
                  {expVehicleId && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="ae-vehicle-cat">
                        Vehicle Category <span className="text-destructive">*</span>
                      </Label>
                      <Select value={expVehicleCategory} onValueChange={setExpVehicleCategory}>
                        <SelectTrigger id="ae-vehicle-cat"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {VEHICLE_EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="ae-note">Note</Label>
                <textarea
                  id="ae-note" value={expNote} onChange={(e) => setExpNote(e.target.value)}
                  placeholder="Optional note…" rows={2}
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {isUntrackedAccount && (
                <label htmlFor="exp-show-history" className="flex cursor-pointer items-center gap-2.5 rounded-md border border-input bg-muted/40 px-3 py-2.5">
                  <input
                    id="exp-show-history"
                    type="checkbox"
                    checked={expShowInHistory}
                    onChange={(e) => setExpShowInHistory(e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-input accent-primary"
                  />
                  <span className="text-sm leading-tight">
                    Show in expense history
                    <span className="block text-xs text-muted-foreground">By default, untracked account expenses are only visible here.</span>
                  </span>
                </label>
              )}
            </>
          )}

          {/* ── Income ── */}
          {tab === "income" && (
            <>
              <div className="flex flex-col items-center gap-1 pb-2">
                <Label htmlFor="inc-amount" className="text-xs text-muted-foreground">Amount</Label>
                <input
                  id="inc-amount" type="number" inputMode="decimal" min="0.01" step="any"
                  value={incAmount} onChange={(e) => setIncAmount(e.target.value)}
                  placeholder="₱0.00" ref={amountRef}
                  className="w-48 border-0 border-b-2 border-input bg-transparent px-0 py-1 text-center text-2xl font-bold tabular-nums placeholder:text-muted-foreground/40 outline-none focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              {accounts.length > 0 ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="inc-account">Account</Label>
                  <AccountSelect id="inc-account" accounts={accounts} value={sharedAccountId} onChange={handleAccountChange} />
                  {sharedAccountId && (
                    <p className="text-xs text-muted-foreground">
                      Current balance: {formatCurrency(balances[sharedAccountId] ?? 0)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">No accounts found.</p>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="inc-desc">Description (optional)</Label>
                <Input id="inc-desc" value={incDescription} onChange={(e) => setIncDescription(e.target.value)} placeholder="e.g. Salary, Freelance payment" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="inc-date">Date</Label>
                <DatePicker id="inc-date" value={incDate} onChange={setIncDate} formatDisplay={formatShortDate} />
              </div>
            </>
          )}

          {/* ── Adjustment ── */}
          {tab === "adjustment" && (
            <>
              <div className="flex flex-col items-center gap-1 pb-2">
                <Label htmlFor="adj-balance" className="text-xs text-muted-foreground">New Balance</Label>
                <input
                  id="adj-balance" type="number" inputMode="decimal" step="0.01"
                  placeholder={adjCurrentBalance.toFixed(2)}
                  value={adjNewBalance} onChange={(e) => setAdjNewBalance(e.target.value)}
                  ref={amountRef}
                  className="w-48 border-0 border-b-2 border-input bg-transparent px-0 py-1 text-center text-2xl font-bold tabular-nums placeholder:text-muted-foreground/40 outline-none focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter the actual current balance to record a difference.
                </p>
                {adjDelta !== null && adjDelta !== 0 && (
                  <p className={cn(
                    "text-xs font-medium",
                    adjDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                  )}>
                    Adjustment: {adjDelta > 0 ? "+" : "−"}{formatCurrency(Math.abs(adjDelta))}
                  </p>
                )}
                {adjNewBalance !== "" && Number.isFinite(adjParsed) && adjDelta === 0 && (
                  <p className="text-xs text-muted-foreground">No change from current balance.</p>
                )}
              </div>
              {accounts.length > 0 ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="adj-account">Account</Label>
                  <AccountSelect
                    id="adj-account" accounts={accounts} value={sharedAccountId}
                    onChange={handleAccountChange}
                  />
                </div>
              ) : (
                <p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">No accounts found.</p>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="adj-notes">Notes (optional)</Label>
                <Input id="adj-notes" value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="e.g. Bank statement reconciliation" />
              </div>
            </>
          )}

          {/* ── Transfer ── */}
          {tab === "transfer" && (
            <>
              <div className="flex flex-col items-center gap-1 pb-2">
                <Label htmlFor="tx-amount" className="text-xs text-muted-foreground">Amount</Label>
                <input
                  id="tx-amount" type="number" inputMode="decimal" step="0.01" min="0"
                  placeholder="₱0.00" value={txAmount} onChange={(e) => setTxAmount(e.target.value)}
                  ref={amountRef}
                  className="w-48 border-0 border-b-2 border-input bg-transparent px-0 py-1 text-center text-2xl font-bold tabular-nums placeholder:text-muted-foreground/40 outline-none focus:border-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="tx-from">From account</Label>
                  {accounts.length > 0 ? (
                    <>
                      <AccountSelect
                        id="tx-from" accounts={accounts} value={sharedAccountId}
                        onChange={(id) => { handleAccountChange(id); if (txTo === id) setTxTo(""); }}
                      />
                      {sharedAccountId && (
                        <p className="text-xs text-muted-foreground">Balance: {formatCurrency(balances[sharedAccountId] ?? 0)}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">No accounts found.</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="tx-to">To account</Label>
                  {txToAccounts.length > 0 ? (
                    <AccountSelect id="tx-to" accounts={txToAccounts} value={txTo} onChange={setTxTo} placeholder="Select destination" />
                  ) : (
                    <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                      You need at least one other account.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="tx-fee">Transfer Fee (optional)</Label>
                <Input
                  id="tx-fee" type="number" inputMode="decimal" step="0.01" min="0"
                  placeholder="0.00" value={txFee} onChange={(e) => setTxFee(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="tx-desc">Description (optional)</Label>
                <Input id="tx-desc" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} placeholder="e.g. Top-up GCash from BDO" />
              </div>
            </>
          )}

        </ScrollFadeBody>

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3">
          <div className="flex w-full gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!tabValid[tab]}>
              {ctaLabel}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </FormPanel>
  );
}

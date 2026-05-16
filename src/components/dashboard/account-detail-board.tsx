"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { BackLink } from "@/components/app/back-link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Edit,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentHeader } from "@/components/app/content-header";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import {
  AccountFormDialog,
  accountToForm,
  accountFormToInput,
  type AccountFormState,
} from "@/components/dashboard/account-form-dialog";
import {
  AccountTransactionDialog,
  AccountTransferDialog,
  type SimpleEntryMode,
} from "@/components/dashboard/account-transaction-dialog";
import { AddExpenseDialog } from "@/components/dashboard/expense/add-expense-dialog";
import {
  updateAccount,
  deleteAccount,
  type AccountRow,
} from "@/actions/accounts";
import {
  createAccountAdjustment,
  createAccountFee,
  createAccountIncome,
  createAccountTransfer,
  deleteAccountTransaction,
  type AccountTransactionRow,
} from "@/actions/account-transactions";
import {
  accountTransactionsQueryOptions,
  invalidateAccountTransactions,
} from "@/lib/query/account-transactions";
import {
  accountsQueryOptions,
  accountBalancesQueryOptions,
  invalidateAccountQueries,
} from "@/lib/query/accounts";
import { formatCurrency, cn } from "@/lib/utils";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

function formatGroupDate(dateStr: string): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (dateStr === todayStr) return "Today";
  if (dateStr === yesterdayStr) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
}

function txMeta(
  tx: AccountTransactionRow,
): { label: string; iconClass: string; sign: 1 | -1 | 0 } {
  if (tx.type === "expense") return { label: "Expense", iconClass: "text-rose-600 dark:text-rose-400", sign: -1 };
  if (tx.type === "fee") return { label: "Fee", iconClass: "text-orange-600 dark:text-orange-400", sign: -1 };
  if (tx.type === "income") return { label: "Income", iconClass: "text-emerald-600 dark:text-emerald-400", sign: 1 };
  if (tx.type === "transfer") {
    return tx.amount >= 0
      ? { label: "Transfer in", iconClass: "text-sky-600 dark:text-sky-400", sign: 1 }
      : { label: "Transfer out", iconClass: "text-sky-600 dark:text-sky-400", sign: -1 };
  }
  // adjustment
  return tx.amount >= 0
    ? { label: "Adjustment", iconClass: "text-emerald-600 dark:text-emerald-400", sign: 1 }
    : { label: "Adjustment", iconClass: "text-rose-600 dark:text-rose-400", sign: -1 };
}

export function AccountDetailBoard({ account: initialAccount }: { account: AccountRow }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const [account, setAccount] = useState<AccountRow>(initialAccount);
  const [activeMode, setActiveMode] = useState<SimpleEntryMode | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const { data: txData = { balance: 0, transactions: [] } } = useQuery(accountTransactionsQueryOptions(account.id));
  const { data: allAccounts = [] } = useQuery(accountsQueryOptions());
  const { data: balances = {} } = useQuery(accountBalancesQueryOptions());

  const animatedBalance = useAnimatedNumber(txData.balance);

  const [amountsHidden, setAmountsHidden] = useState(false);
  useEffect(() => {
    setAmountsHidden(localStorage.getItem("omnitrak-amounts-hidden") === "1");
  }, []);

  function toggleAmountsHidden() {
    setAmountsHidden((prev) => {
      const next = !prev;
      localStorage.setItem("omnitrak-amounts-hidden", next ? "1" : "0");
      return next;
    });
  }

  // Pre-compute balance before/after each transaction (transactions are newest-first).
  const txBalances = useMemo(() => {
    let running = 0;
    return txData.transactions.map((tx) => {
      const after = txData.balance - running;
      running += tx.amount;
      return { before: after - tx.amount, after };
    });
  }, [txData]);

  // Group transactions by calendar date for the history view (order preserved, newest-first).
  const txGroups = useMemo(() => {
    const groups: Array<{ date: string; entries: Array<{ tx: AccountTransactionRow; idx: number }> }> = [];
    txData.transactions.forEach((tx, idx) => {
      const date = tx.occurred_at.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.date === date) {
        last.entries.push({ tx, idx });
      } else {
        groups.push({ date, entries: [{ tx, idx }] });
      }
    });
    return groups;
  }, [txData.transactions]);

  const otherAccounts = useMemo(
    () => allAccounts
      .filter((a: AccountRow) => a.id !== account.id)
      .map((a: AccountRow) => ({ ...a, balance: balances[a.id] ?? 0 })),
    [allAccounts, account.id, balances],
  );

  const invalidateTx = useCallback(() => {
    invalidateAccountTransactions(queryClient, account.id);
    invalidateAccountQueries(queryClient);
  }, [queryClient, account.id]);

  function handleSimpleSave({ amount, description, direction, date, accountId }: { amount: number; description: string; direction: 1 | -1; date: string; accountId: string }) {
    if (!activeMode) return;
    setTxError(null);
    startTransition(async () => {
      const res =
        activeMode === "income"
          ? await createAccountIncome({ accountId: accountId || account.id, amount, description, occurredAt: date })
          : await createAccountAdjustment({
            accountId: account.id,
            amount: direction === 1 ? amount : -amount,
            description,
          });
      if (res.error) {
        setTxError(res.error);
        return;
      }
      setActiveMode(null);
      invalidateTx();
    });
  }

  function handleTransferSave({ toAccountId, amount, description, fee }: { toAccountId: string; amount: number; description: string; fee: number }) {
    setTxError(null);
    startTransition(async () => {
      const res = await createAccountTransfer({
        fromAccountId: account.id,
        toAccountId,
        amount,
        description,
      });
      if (res.error) {
        setTxError(res.error);
        return;
      }
      if (fee > 0) {
        await createAccountFee({
          accountId: account.id,
          amount: fee,
          description: description ? `Transfer fee — ${description}` : "Transfer fee",
        });
      }
      setTransferOpen(false);
      invalidateTx();
    });
  }

  function handleDeleteTransaction() {
    if (!deletingTxId) return;
    startTransition(async () => {
      await deleteAccountTransaction(deletingTxId);
      setDeletingTxId(null);
      invalidateTx();
    });
  }

  function handleEditAccount(form: AccountFormState) {
    setFormError(null);
    startTransition(async () => {
      const input = accountFormToInput(form);
      const res = await updateAccount(account.id, input);
      if (res.error) {
        setFormError(res.error);
        return;
      }
      setAccount({ ...account, ...input });
      setEditOpen(false);
      invalidateAccountQueries(queryClient);
    });
  }

  function handleDeleteAccount() {
    const previousAccounts = queryClient.getQueryData(accountsQueryOptions().queryKey);
    queryClient.setQueryData(
      accountsQueryOptions().queryKey,
      (old: AccountRow[] | undefined) => (old ?? []).filter((a) => a.id !== account.id),
    );
    setDeleteOpen(false);
    router.push("/dashboard/accounts");
    deleteAccount(account.id).then((res) => {
      if (res?.error) {
        queryClient.setQueryData(accountsQueryOptions().queryKey, previousAccounts);
      } else {
        invalidateAccountQueries(queryClient);
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <BackLink href="/dashboard/accounts" label="Accounts" />

      <ContentHeader
        title={
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: account.color }}
              aria-hidden
            />
            <span className="min-w-0 truncate">{account.account_alias}</span>
          </span>
        }
        subtitle={`${account.bank_name} • Record expenses, income, transfers, and adjustments tied to this account.`}
        actions={
          account.bank_name !== "Cash" ? (
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { setFormError(null); setEditOpen(true); }} aria-label="Edit account">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)} aria-label="Delete account">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null
        }
      />

      {/* Balance card */}
      <div className="rounded-2xl border bg-card px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current balance</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <p className={cn("text-3xl font-bold tabular-nums", txData.balance < 0 && !amountsHidden && "text-rose-600 dark:text-rose-400")}>
              {amountsHidden ? "••••••" : formatCurrency(animatedBalance)}
            </p>
            <button
              onClick={toggleAmountsHidden}
              className="pt-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={amountsHidden ? "Show amounts" : "Hide amounts"}
            >
              {amountsHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {account.maintaining_balance != null &&
            account.maintaining_balance > 0 &&
            txData.balance < account.maintaining_balance && (
              <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Below maintaining balance{amountsHidden ? "" : ` (${formatCurrency(account.maintaining_balance)})`}
              </span>
            )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Computed from {txData.transactions.length} {txData.transactions.length === 1 ? "entry" : "entries"} on this account.
        </p>

        {/* Action buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button variant="outline" className="gap-1.5" onClick={() => { setTxError(null); setAddExpenseOpen(true); }}>
            <ArrowDownCircle className="h-4 w-4 text-rose-500" />
            Add Expense
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => { setTxError(null); setActiveMode("income"); }}>
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
            Add Income
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => { setTxError(null); setActiveMode("adjustment"); }}>
            <Edit className="h-4 w-4 text-amber-500" />
            Adjustment
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => { setTxError(null); setTransferOpen(true); }}>
            <ArrowLeftRight className="h-4 w-4 text-sky-500" />
            Transfer
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</h2>
        {txData.transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center text-muted-foreground">
            <p className="text-sm">No entries yet.</p>
            <p className="max-w-md text-xs">Add an expense, income, adjustment, or transfer to start tracking the balance on this account.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {txGroups.map((group) => (
              <div key={group.date} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatGroupDate(group.date)}
                </p>
                <ul className="space-y-2">
                  {group.entries.map(({ tx, idx }) => {
                    const meta = txMeta(tx);
                    const counterpartName = tx.transfer_counterpart?.account_alias ?? "another account";
                    const { before, after } = txBalances[idx] ?? { before: 0, after: 0 };
                    return (
                      <li
                        key={tx.id}
                        className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn("text-xs font-semibold uppercase tracking-wide", meta.iconClass)}>
                              {meta.label}
                            </span>
                            {tx.type === "transfer" && (
                              <span className="text-[11px] text-muted-foreground">
                                {tx.amount >= 0 ? `from ${counterpartName}` : `to ${counterpartName}`}
                              </span>
                            )}
                          </div>
                          {tx.description && (
                            <p className="mt-0.5 truncate text-sm">{tx.description}</p>
                          )}
                          {tx.type === "adjustment" && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                              {amountsHidden ? "•••••• → ••••••" : `${formatCurrency(before)} → ${formatCurrency(after)}`}
                            </p>
                          )}
                        </div>
                        <p className={cn(
                          "flex-shrink-0 text-sm font-semibold tabular-nums",
                          !amountsHidden && tx.amount > 0 && "text-emerald-600 dark:text-emerald-400",
                          !amountsHidden && tx.amount < 0 && "text-rose-600 dark:text-rose-400",
                        )}>
                          {amountsHidden ? "••••••" : `${tx.amount > 0 ? "+" : tx.amount < 0 ? "−" : ""}${formatCurrency(Math.abs(tx.amount))}`}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingTxId(tx.id)}
                          aria-label="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense dialog (expenses module) */}
      <AddExpenseDialog
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        initialAccountId={account.id}
      />

      {/* Income / Adjustment dialog */}
      {activeMode && (
        <AccountTransactionDialog
          open
          mode={activeMode}
          currentBalance={txData.balance}
          accounts={allAccounts}
          defaultAccountId={account.id}
          onClose={() => setActiveMode(null)}
          onSave={handleSimpleSave}
          isPending={isPending}
          error={txError}
        />
      )}

      {/* Transfer dialog */}
      <AccountTransferDialog
        open={transferOpen}
        fromAccountId={account.id}
        otherAccounts={otherAccounts}
        onClose={() => setTransferOpen(false)}
        onSave={handleTransferSave}
        isPending={isPending}
        error={txError}
      />

      {/* Edit account dialog */}
      {editOpen && (
        <AccountFormDialog
          open
          onClose={() => setEditOpen(false)}
          onSave={handleEditAccount}
          initial={accountToForm(account)}
          isPending={isPending}
          error={formError}
        />
      )}

      {/* Confirm delete account */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete account?"
        description="The account and all its expense, income, transfer, and adjustment entries will be removed. Expenses and bills tagged to it will be unlinked but not deleted."
        confirmLabel={isPending ? "Deleting…" : "Delete"}
        variant="destructive"
        onConfirm={handleDeleteAccount}
      />

      {/* Confirm delete transaction */}
      <ConfirmDialog
        open={!!deletingTxId}
        onOpenChange={(v) => !v && setDeletingTxId(null)}
        title="Delete entry?"
        description="This entry will be removed and the balance recalculated. Transfers will remove both legs."
        confirmLabel={isPending ? "Deleting…" : "Delete"}
        variant="destructive"
        onConfirm={handleDeleteTransaction}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BackLink } from "@/components/app/back-link";
import { useRouter } from "next/navigation";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "@/components/ui/snackbar-provider";
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
import { AddEntryPanel, type EntryTab } from "@/components/dashboard/add-entry-panel";
import {
  updateAccount,
  deleteAccount,
  type AccountRow,
} from "@/actions/accounts";
import {
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
  if (tx.type === "auto_pay") return { label: "Auto Pay", iconClass: "text-violet-600 dark:text-violet-400", sign: -1 };
  if (tx.type === "fee") return { label: "Fee", iconClass: "text-orange-600 dark:text-orange-400", sign: -1 };
  if (tx.type === "income") return { label: "Income", iconClass: "text-emerald-600 dark:text-emerald-400", sign: 1 };
  if (tx.type === "transfer") {
    return tx.amount >= 0
      ? { label: "Transfer in", iconClass: "text-sky-600 dark:text-sky-400", sign: 1 }
      : { label: "Transfer out", iconClass: "text-sky-600 dark:text-sky-400", sign: -1 };
  }
  return tx.amount >= 0
    ? { label: "Adjustment", iconClass: "text-emerald-600 dark:text-emerald-400", sign: 1 }
    : { label: "Adjustment", iconClass: "text-rose-600 dark:text-rose-400", sign: -1 };
}

export function AccountDetailBoard({ account: initialAccount }: { account: AccountRow }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const { showError } = useSnackbar();

  const [account, setAccount] = useState<AccountRow>(initialAccount);
  const [addEntryTab, setAddEntryTab] = useState<EntryTab | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: txData } = useSuspenseQuery(accountTransactionsQueryOptions(account.id));

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

  // Sort newest date first, then newest created_at first within each date.
  const sortedTxs = useMemo(() => (
    [...txData.transactions].sort((a, b) => {
      const dateDiff = b.occurred_at.slice(0, 10).localeCompare(a.occurred_at.slice(0, 10));
      return dateDiff !== 0 ? dateDiff : b.created_at.localeCompare(a.created_at);
    })
  ), [txData.transactions]);

  const txBalances = useMemo(() => {
    let running = 0;
    return sortedTxs.map((tx) => {
      const after = txData.balance - running;
      running += tx.amount;
      return { before: after - tx.amount, after };
    });
  }, [sortedTxs, txData.balance]);

  const txGroups = useMemo(() => {
    const groups: Array<{ date: string; entries: Array<{ tx: AccountTransactionRow; idx: number }> }> = [];
    sortedTxs.forEach((tx, idx) => {
      const date = tx.occurred_at.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.date === date) {
        last.entries.push({ tx, idx });
      } else {
        groups.push({ date, entries: [{ tx, idx }] });
      }
    });
    return groups;
  }, [sortedTxs]);

  function handleDeleteTransaction() {
    if (!deletingTxId) return;

    const txKey = accountTransactionsQueryOptions(account.id).queryKey;
    const balancesKey = accountBalancesQueryOptions().queryKey;
    const prevTx = queryClient.getQueryData(txKey);
    const prevBalances = queryClient.getQueryData(balancesKey);

    const txToDelete = txData.transactions.find((t) => t.id === deletingTxId);

    // Optimistically remove the entry and adjust balance before the server responds
    if (txToDelete) {
      queryClient.setQueryData<{ transactions: AccountTransactionRow[]; balance: number }>(txKey, (old) => {
        if (!old) return old;
        return {
          transactions: old.transactions.filter((t) => t.id !== deletingTxId),
          balance: old.balance - txToDelete.amount,
        };
      });
      queryClient.setQueryData<Record<string, number>>(balancesKey, (old = {}) => ({
        ...old,
        [account.id]: (old[account.id] ?? 0) - txToDelete.amount,
      }));
    }

    setDeletingTxId(null);

    void (async () => {
      const res = await deleteAccountTransaction(deletingTxId);
      if (res?.error) {
        queryClient.setQueryData(txKey, prevTx);
        queryClient.setQueryData(balancesKey, prevBalances);
        showError(res.error);
      } else {
        invalidateAccountTransactions(queryClient, account.id);
        invalidateAccountQueries(queryClient);
      }
    })();
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
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { setFormError(null); setEditOpen(true); }} aria-label="Edit account">
              <Pencil className="h-4 w-4" />
            </Button>
            {account.bank_name !== "Cash" && (
              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)} aria-label="Delete account">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
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
          <Button variant="outline" className="gap-1.5" onClick={() => setAddEntryTab("expense")}>
            <ArrowDownCircle className="h-4 w-4 text-rose-500" />
            Add Expense
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setAddEntryTab("income")}>
            <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
            Add Income
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setAddEntryTab("adjustment")}>
            <Edit className="h-4 w-4 text-amber-500" />
            Adjustment
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setAddEntryTab("transfer")}>
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

      {/* Unified add entry panel */}
      <AddEntryPanel
        open={addEntryTab !== null}
        onClose={() => setAddEntryTab(null)}
        initialTab={addEntryTab ?? "expense"}
        accountId={account.id}
      />

      {/* Edit account dialog */}
      {editOpen && (
        <AccountFormDialog
          open
          onClose={() => setEditOpen(false)}
          onSave={handleEditAccount}
          initial={accountToForm(account)}
          isCash={account.bank_name === "Cash"}
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
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteTransaction}
      />
    </div>
  );
}

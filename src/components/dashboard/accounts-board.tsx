"use client";

import { useState, useEffect, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContentHeader } from "@/components/app/content-header";
import { OttoAnimated } from "@/components/mascot/otto";
import { AccountCard } from "@/components/dashboard/accounts/account-card";
import {
  AccountFilterChips,
  type AccountFilterOption,
} from "@/components/dashboard/accounts/account-filter-chips";
import { AccountMixCard } from "@/components/dashboard/accounts/account-mix-card";
import { NetBalanceCard } from "@/components/dashboard/accounts/net-balance-card";
import { CONTENT_HEADER_ACTION_SIZE } from "@/lib/constants/content-header";
import {
  ACCOUNT_FILTER_ALL,
  ACCOUNT_GROUPS,
  CASH_BANK_NAME,
  NET_BALANCE_HISTORY_DAYS,
  type AccountFilter,
} from "@/lib/constants/accounts";
import { AMOUNTS_HIDDEN_STORAGE_KEY } from "@/lib/constants/dashboard";
import {
  computeNetBalance,
  sortAccountsCashFirst,
  summariseAccountMix,
  type AccountType,
} from "@/lib/shared/accounts";
import {
  accountsQueryOptions,
  accountBalancesQueryOptions,
  netBalanceHistoryQueryOptions,
  invalidateAccountQueries,
} from "@/lib/query/accounts";
import {
  createAccount,
  updateAccount,
  setAccountTracked,
  deleteAccount,
  type AccountRow,
} from "@/actions/accounts";
import {
  AccountFormDialog,
  accountToForm,
  accountFormToInput,
  type AccountFormState,
} from "@/components/dashboard/account-form-dialog";

export function AccountsBoard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  // Separate transition for navigation so the clicked card's 3-dots icon can
  // show a spinner while the account detail route loads (RSC fetch in flight).
  const [isNavPending, startNavTransition] = useTransition();
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  const handleOpen = useCallback(
    (id: string) => {
      setNavigatingId(id);
      startNavTransition(() => {
        router.push(`/dashboard/accounts/${id}`);
      });
    },
    [router],
  );

  const { data: accounts } = useSuspenseQuery(accountsQueryOptions());
  const { data: balances } = useSuspenseQuery(accountBalancesQueryOptions());
  const { data: netHistory } = useSuspenseQuery(netBalanceHistoryQueryOptions(NET_BALANCE_HISTORY_DAYS));

  const netBalance = useMemo(() => computeNetBalance(accounts, balances), [accounts, balances]);

  const includedCount = useMemo(
    () => accounts.filter((a: AccountRow) => a.include_in_net_balance).length,
    [accounts],
  );

  const mix = useMemo(() => summariseAccountMix(accounts, balances), [accounts, balances]);

  const sortedAccounts = useMemo(() => sortAccountsCashFirst(accounts), [accounts]);

  // "All", then one chip per account type the user actually has.
  const filterOptions = useMemo<AccountFilterOption[]>(() => {
    const counts = new Map<AccountType, number>();
    for (const acc of accounts) counts.set(acc.account_type, (counts.get(acc.account_type) ?? 0) + 1);
    return [
      { id: ACCOUNT_FILTER_ALL, label: "All", count: accounts.length },
      ...ACCOUNT_GROUPS.filter(({ type }) => counts.has(type)).map(({ type, label }) => ({
        id: type,
        label,
        count: counts.get(type) ?? 0,
      })),
    ];
  }, [accounts]);

  const [filter, setFilter] = useState<AccountFilter>(ACCOUNT_FILTER_ALL);
  // The chips only earn their place with two or more types. A filter whose last
  // account was deleted or retyped falls back to All.
  const showFilter = filterOptions.length > 2;
  const activeFilter: AccountFilter =
    showFilter && filterOptions.some((o) => o.id === filter) ? filter : ACCOUNT_FILTER_ALL;

  const visibleAccounts = useMemo(
    () =>
      activeFilter === ACCOUNT_FILTER_ALL
        ? sortedAccounts
        : sortedAccounts.filter((a: AccountRow) => a.account_type === activeFilter),
    [sortedAccounts, activeFilter],
  );

  const [amountsHidden, setAmountsHidden] = useState(false);
  useEffect(() => {
    setAmountsHidden(localStorage.getItem(AMOUNTS_HIDDEN_STORAGE_KEY) === "1");
  }, []);

  function toggleAmountsHidden() {
    setAmountsHidden((prev) => {
      const next = !prev;
      localStorage.setItem(AMOUNTS_HIDDEN_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState(0);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = useCallback(() => {
    invalidateAccountQueries(queryClient);
  }, [queryClient]);

  function openAdd() {
    setFormError(null);
    setAddKey((k) => k + 1);
    setAddOpen(true);
  }

  function handleAdd(form: AccountFormState) {
    setFormError(null);
    startTransition(async () => {
      const res = await createAccount(accountFormToInput(form));
      if (res.error) { setFormError(res.error); return; }
      setAddOpen(false);
      invalidate();
    });
  }

  function handleEdit(form: AccountFormState) {
    if (!editingAccount) return;
    setFormError(null);
    startTransition(async () => {
      const res = await updateAccount(editingAccount.id, accountFormToInput(form));
      if (res.error) { setFormError(res.error); return; }
      setEditingAccount(null);
      invalidate();
    });
  }

  function handleToggleTracked(account: AccountRow) {
    startTransition(async () => {
      await setAccountTracked(account.id, !account.include_in_net_balance);
      invalidate();
    });
  }

  function handleDelete() {
    if (!deletingId) return;
    startTransition(async () => {
      await deleteAccount(deletingId);
      setDeletingId(null);
      invalidate();
    });
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-4 px-4 py-6">
      <ContentHeader
        title="Accounts"
        icon={Wallet}
        subtitle="Your accounts hub — record expenses, income, transfers, and adjustments here. This isn&apos;t linked to your real bank or e-wallet."
        actions={
          <Button size={CONTENT_HEADER_ACTION_SIZE.button} className="gap-1.5" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        }
      />

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <OttoAnimated pose="think" size={150} />
          <p className="text-base font-semibold text-foreground">No accounts yet</p>
          <p className="max-w-[40ch] text-sm">Add one to start tracking by account.</p>
          <Button size="lg" className="mt-3 gap-1.5" onClick={openAdd}>
            <Plus className="size-4" aria-hidden />
            Add Account
          </Button>
        </div>
      ) : (
        // Columns follow this box's width, not the screen's: the sidebar takes 16rem
        // from tablets up, so the viewport alone overstates the room there is.
        <div className="space-y-4 @container">
          {/* Summary: net balance with its 7-day line, and the split by account type */}
          <div className="grid gap-3 @4xl:grid-cols-2">
            <NetBalanceCard
              netBalance={netBalance}
              series={netHistory}
              accountCount={accounts.length}
              trackedCount={includedCount}
              amountsHidden={amountsHidden}
              onToggleAmountsHidden={toggleAmountsHidden}
            />
            <AccountMixCard mix={mix} amountsHidden={amountsHidden} />
          </div>

          <section aria-label="Your accounts" className="space-y-3 pt-1">
            {showFilter && (
              <AccountFilterChips options={filterOptions} value={activeFilter} onChange={setFilter} />
            )}

            <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-4">
              {visibleAccounts.map((acc: AccountRow) => (
                <AccountCard
                  key={acc.id}
                  account={acc}
                  balance={balances[acc.id] ?? 0}
                  hideAmounts={amountsHidden}
                  loading={isNavPending && navigatingId === acc.id}
                  onOpen={() => handleOpen(acc.id)}
                  onEdit={() => { setFormError(null); setEditingAccount(acc); }}
                  onToggleTracked={() => handleToggleTracked(acc)}
                  onDelete={() => setDeletingId(acc.id)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Add dialog */}
      <AccountFormDialog
        key={addKey}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
        isPending={isPending}
        error={formError}
      />

      {/* Edit dialog */}
      {editingAccount && (
        <AccountFormDialog
          open={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={handleEdit}
          initial={accountToForm(editingAccount)}
          isCash={editingAccount.bank_name === CASH_BANK_NAME}
          isPending={isPending}
          error={formError}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The account will be removed. Expenses and bills tagged to it will be unlinked but not deleted.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="w-1/2" onClick={() => setDeletingId(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" className="w-1/2" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useTransition, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentHeader } from "@/components/app/content-header";
import { useUser } from "@/hooks/use-user";
import { formatCurrency, cn } from "@/lib/utils";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import {
  accountsQueryOptions,
  accountTotalsQueryOptions,
  invalidateAccountQueries,
} from "@/lib/query/accounts";
import {
  createAccount,
  updateAccount,
  deleteAccount,
  type AccountRow,
} from "@/actions/accounts";

// ─── Constants ───────────────────────────────────────────────────────────────

const PHILIPPINE_BANKS = [
  "BDO Unibank",
  "Bank of the Philippine Islands (BPI)",
  "Metrobank",
  "Philippine National Bank (PNB)",
  "Security Bank",
  "Landbank of the Philippines",
  "Development Bank of the Philippines (DBP)",
  "UnionBank",
  "China Banking Corporation (Chinabank)",
  "RCBC",
  "EastWest Bank",
  "Maybank Philippines",
  "Asia United Bank (AUB)",
  "Philippine Savings Bank (PSBank)",
  "Robinsons Bank",
  "CTBC Bank Philippines",
  "ING Bank Philippines",
  "HSBC Philippines",
  "Citibank Philippines",
  "Standard Chartered Philippines",
  "BDO Network Bank",
  "Overseas Filipino Bank (OFBank)",
  "GCash",
  "Maya (PayMaya)",
  "SeaBank Philippines",
  "CIMB Bank Philippines",
  "Tonik Digital Bank",
  "GoTyme Bank",
  "OwnBank",
  "Other",
];

const TAG_PRESETS = [
  "Savings",
  "Bills & Utilities",
  "Daily Expenses",
  "Groceries",
  "Wants / Leisure",
  "Emergency Fund",
  "Business",
  "Travel",
  "Healthcare",
  "Education",
  "Investments",
  "Rent & Housing",
  "Allowance",
  "Payroll",
];

const COLOR_SWATCHES = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Pink", value: "#ec4899" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Emerald", value: "#10b981" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Slate", value: "#64748b" },
];

// ─── Account Form Dialog ─────────────────────────────────────────────────────

type AccountFormState = {
  account_alias: string;
  bank_name: string;
  tags: string[];
  color: string;
};

const EMPTY_FORM: AccountFormState = {
  account_alias: "",
  bank_name: "",
  tags: [],
  color: "#6366f1",
};

function accountToForm(acc: AccountRow): AccountFormState {
  return {
    account_alias: acc.account_alias,
    bank_name: acc.bank_name,
    tags: acc.tags,
    color: acc.color,
  };
}

function AccountFormDialog({
  open,
  onClose,
  onSave,
  initial,
  isPending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: AccountFormState) => void;
  initial?: AccountFormState;
  isPending: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<AccountFormState>(initial ?? EMPTY_FORM);
  const [customTag, setCustomTag] = useState("");

  function resetAndOpen() {
    setForm(initial ?? EMPTY_FORM);
    setCustomTag("");
  }

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (t && !form.tags.includes(t)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setCustomTag("");
  }

  const isValid = form.account_alias.trim() && form.bank_name.trim();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) resetAndOpen();
        else onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Account" : "Add Account"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Alias */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-alias">Account Alias</Label>
            <Input
              id="acc-alias"
              placeholder="e.g. BDO Savings, GCash"
              value={form.account_alias}
              onChange={(e) => setForm((p) => ({ ...p, account_alias: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Bank */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-bank">Bank / E-Wallet</Label>
            <Select
              value={form.bank_name}
              onValueChange={(v) => setForm((p) => ({ ...p, bank_name: v }))}
            >
              <SelectTrigger id="acc-bank">
                <SelectValue placeholder="Select bank or e-wallet" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {PHILIPPINE_BANKS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_PRESETS.map((tag) => {
                const active = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            {/* Selected non-preset tags */}
            {form.tags.filter((t) => !TAG_PRESETS.includes(t)).map((t) => (
              <Badge key={t} variant="secondary" className="gap-1 text-xs">
                {t}
                <button type="button" onClick={() => toggleTag(t)} className="ml-0.5 hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
            {/* Custom tag input */}
            <div className="flex gap-1.5 pt-1">
              <Input
                placeholder="Custom tag…"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                className="h-7 text-xs"
              />
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={addCustomTag} disabled={!customTag.trim()}>
                Add
              </Button>
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onClick={() => setForm((p) => ({ ...p, color: value }))}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    form.color === value ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: value }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2 pt-1">
            <Button variant="outline" className="w-1/2" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button className="w-1/2" onClick={() => onSave(form)} disabled={!isValid || isPending}>
              {isPending ? "Saving…" : initial ? "Save changes" : "Add account"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  expenseTotal,
  billTotal,
  onEdit,
  onDelete,
}: {
  account: AccountRow;
  expenseTotal: number;
  billTotal: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const total = expenseTotal + billTotal;
  return (
    <div className="group relative flex overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Color stripe */}
      <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: account.color }} />

      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-tight">{account.account_alias}</p>
            <p className="truncate text-xs text-muted-foreground">{account.bank_name}</p>
          </div>
          <div className="flex flex-shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={onEdit}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-full p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {account.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {account.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${account.color}22`, color: account.color }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto border-t pt-2">
          <p className="text-lg font-bold tabular-nums">{formatCurrency(total)}</p>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            {expenseTotal > 0 && <span>Expenses {formatCurrency(expenseTotal)}</span>}
            {billTotal > 0 && <span>Bills {formatCurrency(billTotal)}</span>}
            {total === 0 && <span>No spending tagged yet</span>}
          </div>
          <p className="text-[10px] text-muted-foreground">This month</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function AccountsBoard() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const paidMonth = getCurrentPaidMonth();
  const [isPending, startTransition] = useTransition();

  const { data: accounts = [], isLoading } = useQuery({
    ...accountsQueryOptions(),
    enabled: !!user,
  });
  const { data: totals } = useQuery({
    ...accountTotalsQueryOptions(paidMonth),
    enabled: !!user,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = useCallback(() => {
    invalidateAccountQueries(queryClient);
  }, [queryClient]);

  function handleAdd(form: AccountFormState) {
    setFormError(null);
    startTransition(async () => {
      const res = await createAccount(form);
      if (res.error) { setFormError(res.error); return; }
      setAddOpen(false);
      invalidate();
    });
  }

  function handleEdit(form: AccountFormState) {
    if (!editingAccount) return;
    setFormError(null);
    startTransition(async () => {
      const res = await updateAccount(editingAccount.id, form);
      if (res.error) { setFormError(res.error); return; }
      setEditingAccount(null);
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
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <ContentHeader
        title="Accounts"
        subtitle="Label expenses and bills to track spending by account."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setFormError(null); setAddOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Landmark className="h-8 w-8 animate-pulse text-muted-foreground/40" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-muted-foreground">
          <Landmark className="h-9 w-9 opacity-30" />
          <p className="text-sm">No accounts yet. Add one to start tagging expenses and bills.</p>
          <Button size="sm" variant="outline" onClick={() => { setFormError(null); setAddOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Account
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <AccountCard
              key={acc.id}
              account={acc}
              expenseTotal={totals?.expenseTotals[acc.id] ?? 0}
              billTotal={totals?.billTotals[acc.id] ?? 0}
              onEdit={() => { setFormError(null); setEditingAccount(acc); }}
              onDelete={() => setDeletingId(acc.id)}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <AccountFormDialog
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
            The account will be removed. Expenses and bills tagged to it will be unlinked (not deleted).
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

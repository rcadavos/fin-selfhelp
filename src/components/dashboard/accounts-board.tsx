"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Wallet, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
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
import { STATIC_ACCOUNT_IDS } from "@/lib/static-accounts";
import {
  PHILIPPINE_BANKS,
} from "@/lib/constants/account-institutions";

const STATIC_IDS = new Set(Object.values(STATIC_ACCOUNT_IDS));

// ─── Constants ───────────────────────────────────────────────────────────────

const TAG_PRESETS = [
  "Cash",
  "Borrowed",
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

// ─── Pie chart ───────────────────────────────────────────────────────────────

function PiePercentLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx?: number; cy?: number; midAngle?: number;
  innerRadius?: number; outerRadius?: number; percent?: number;
}) {
  if (percent === undefined || percent < 0.05) return null;
  if (cx === undefined || cy === undefined || midAngle === undefined || innerRadius === undefined || outerRadius === undefined) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function AccountsPieChart({
  accounts,
  expenseTotals,
  billTotals,
}: {
  accounts: AccountRow[];
  expenseTotals: Record<string, number>;
  billTotals: Record<string, number>;
}) {
  const data = useMemo(() =>
    accounts
      .map((acc) => ({
        name: acc.account_alias,
        value: (expenseTotals[acc.id] ?? 0) + (billTotals[acc.id] ?? 0),
        color: acc.color,
      }))
      .filter((d) => d.value > 0),
    [accounts, expenseTotals, billTotals]
  );

  if (!data.length) return null;

  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            labelLine={false}
            label={PiePercentLabel}
            dataKey="value"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} style={{ outline: "none" }} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => {
              const total = data.reduce((s, d) => s + d.value, 0);
              const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(0) : 0;
              return [`${pct}% : ${formatCurrency(Number(value ?? 0))}`, ""];
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Account row ─────────────────────────────────────────────────────────────

function AccountRow({
  account,
  expenseTotal,
  billTotal,
  onEdit,
  onDelete,
  isStatic,
}: {
  account: AccountRow;
  expenseTotal: number;
  billTotal: number;
  onEdit: () => void;
  onDelete: () => void;
  isStatic?: boolean;
}) {
  const total = expenseTotal + billTotal;

  return (
    <div
      onClick={isStatic ? undefined : onEdit}
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors",
        !isStatic && "cursor-pointer hover:bg-muted/40"
      )}
    >
      {/* Color dot */}
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: account.color }}
      />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold">{account.account_alias}</p>
          {isStatic ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Built-in
            </span>
          ) : (
            <p className="text-xs text-muted-foreground">{account.bank_name}</p>
          )}
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
        <p className="text-[11px] text-muted-foreground">
          {total === 0
            ? "No spending tagged"
            : `Expenses ${formatCurrency(expenseTotal)} • Bills ${formatCurrency(billTotal)}`}
        </p>
      </div>

      {/* Total */}
      <p className="flex-shrink-0 text-sm font-semibold tabular-nums">
        {formatCurrency(total)}
      </p>

      {/* Delete — hidden for built-in accounts */}
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "h-7 w-7 flex-shrink-0 text-muted-foreground transition-opacity hover:text-destructive",
          {
            "opacity-100": !isStatic,
            "opacity-0 pointer-events-none": isStatic,
          }
        )}
        disabled={isStatic}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete account"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

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
  const [bankSearch, setBankSearch] = useState("");

  const sortedBanks = useMemo(
    () => [...PHILIPPINE_BANKS].sort((a, b) => a.localeCompare(b)),
    []
  );
  const filteredBanks = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    if (!query) return sortedBanks;
    return sortedBanks.filter((bank) => bank.toLowerCase().includes(query));
  }, [bankSearch, sortedBanks]);

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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex flex-col overflow-hidden p-0 max-h-[min(90dvh,calc(100dvh-2rem))] sm:max-w-md">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-2">
          <DialogTitle>{initial ? "Edit Account" : "Add Account"}</DialogTitle>
        </DialogHeader>

        <ScrollFadeBody className="space-y-4 px-6 py-4">
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
              onValueChange={(v) => {
                setForm((p) => ({ ...p, bank_name: v }));
                setBankSearch("");
              }}
            >
              <SelectTrigger id="acc-bank">
                <SelectValue placeholder="Select bank or e-wallet" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <div className="sticky top-0 z-10 bg-popover px-2 pb-2 pt-1">
                  <Input
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Search bank or e-wallet..."
                    className="h-8 text-xs"
                  />
                </div>
                {filteredBanks.length > 0 ? (
                  filteredBanks.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))
                ) : (
                  <p className="px-2 py-2 text-xs text-muted-foreground">No banks found.</p>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
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
            <div className="flex flex-wrap gap-1">
              {form.tags.filter((t) => !TAG_PRESETS.includes(t)).map((t) => (
                <Badge key={t} variant="secondary" className="gap-1 text-xs">
                  {t}
                  <button type="button" onClick={() => toggleTag(t)} className="ml-0.5 hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            {/* Custom tag input */}
            <div className="flex gap-1.5">
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
        </ScrollFadeBody>

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 pb-4 pt-3">
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => onSave(form)} disabled={!isValid || isPending}>
              {isPending ? "Saving…" : initial ? "Save changes" : "Add account"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function AccountsBoard() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const paidMonth = getCurrentPaidMonth();
  const [isPending, startTransition] = useTransition();

  const { data: accounts } = useSuspenseQuery(accountsQueryOptions());
  const { data: totals } = useSuspenseQuery(accountTotalsQueryOptions(paidMonth));

  const expenseTotals = totals?.expenseTotals ?? {};
  const billTotals = totals?.billTotals ?? {};

  const userAccounts = useMemo(() => accounts.filter((a) => !STATIC_IDS.has(a.id as never)), [accounts]);

  const grandTotal = useMemo(
    () => accounts.reduce((s, acc) => s + (expenseTotals[acc.id] ?? 0) + (billTotals[acc.id] ?? 0), 0),
    [accounts, expenseTotals, billTotals]
  );

  const hasChartData = accounts.some(
    (acc) => (expenseTotals[acc.id] ?? 0) + (billTotals[acc.id] ?? 0) > 0
  );

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
        icon={Wallet}
        subtitle="Your accounts hub — record expenses, income, transfers, and adjustments here. This isn&apos;t linked to your real bank or e-wallet; it&apos;s simply for labeling."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => { setFormError(null); setAddOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        }
      />

      {/* Summary: stats + pie chart */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Stat cards */}
        <div className="flex flex-row gap-3 sm:w-1/3 sm:flex-col">
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Accounts</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{userAccounts.length}</p>
            <p className="text-[11px] text-muted-foreground">
              {userAccounts.length === 1 ? "Account" : "Accounts"} added
            </p>
          </div>
          <div className="flex-1 rounded-xl border bg-card px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">This Month</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{formatCurrency(grandTotal)}</p>
            <p className="text-[11px] text-muted-foreground">Across all accounts</p>
          </div>
        </div>

        {/* Pie chart */}
        <div className="sm:w-2/3">
          {hasChartData ? (
            <Card className="h-full">
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Spending by account - this month
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 pb-3">
                <AccountsPieChart accounts={accounts} expenseTotals={expenseTotals} billTotals={billTotals} />
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-full min-h-[160px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
              {accounts.length === 0 ? "Add an account to see the chart" : "Tag expenses or bills to see the chart"}
            </div>
          )}
        </div>
      </div>

      {/* Accounts list */}
      <div className="space-y-2">
        <>
            {accounts.map((acc) => (
              <AccountRow
                key={acc.id}
                account={acc}
                expenseTotal={expenseTotals[acc.id] ?? 0}
                billTotal={billTotals[acc.id] ?? 0}
                onEdit={() => { setFormError(null); setEditingAccount(acc); }}
                onDelete={() => setDeletingId(acc.id)}
                isStatic={STATIC_IDS.has(acc.id as never)}
              />
            ))}
            {userAccounts.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-muted-foreground">
                <p className="text-sm">No custom accounts yet. Add one to start tracking by account.</p>
                <Button size="sm" variant="outline" onClick={() => { setFormError(null); setAddOpen(true); }}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Account
                </Button>
              </div>
            )}
          </>
      </div>

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

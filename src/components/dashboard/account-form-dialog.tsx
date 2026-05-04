"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "@/lib/utils";
import { PHILIPPINE_BANKS } from "@/lib/constants/account-institutions";
import type { AccountRow, AccountType, InterestFrequency } from "@/actions/accounts";

export type AccountFormState = {
  account_alias: string;
  bank_name: string;
  tags: string[];
  color: string;
  account_type: AccountType;
  starting_balance: string;
  interest_frequency: InterestFrequency | "";
  include_in_net_balance: boolean;
};

export const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
];

export const INTEREST_FREQUENCY_OPTIONS: Array<{ value: InterestFrequency; label: string }> = [
  { value: "daily",     label: "Daily" },
  { value: "weekly",    label: "Weekly" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually",  label: "Annually" },
];

export const ACCOUNT_TAG_PRESETS = [
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

export const ACCOUNT_COLOR_SWATCHES = [
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

const EMPTY_FORM: AccountFormState = {
  account_alias: "",
  bank_name: "",
  tags: [],
  color: "#6366f1",
  account_type: "debit",
  starting_balance: "0",
  interest_frequency: "",
  include_in_net_balance: true,
};

export function accountToForm(acc: AccountRow): AccountFormState {
  return {
    account_alias: acc.account_alias,
    bank_name: acc.bank_name,
    tags: acc.tags,
    color: acc.color,
    account_type: acc.account_type,
    starting_balance: String(acc.starting_balance ?? 0),
    interest_frequency: acc.interest_frequency ?? "",
    include_in_net_balance: acc.include_in_net_balance,
  };
}

/** Adapt the dialog's local form state into the shape `createAccount` / `updateAccount` expect. */
export function accountFormToInput(form: AccountFormState) {
  const starting = Number(form.starting_balance);
  return {
    account_alias: form.account_alias,
    bank_name: form.bank_name,
    tags: form.tags,
    color: form.color,
    account_type: form.account_type,
    starting_balance: Number.isFinite(starting) ? starting : 0,
    interest_frequency: form.interest_frequency === "" ? null : form.interest_frequency,
    include_in_net_balance: form.include_in_net_balance,
  };
}

export function AccountFormDialog({
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
        <DialogHeader className="flex-shrink-0 px-6 pt-6">
          <DialogTitle>{initial ? "Edit Account" : "Add Account"}</DialogTitle>
        </DialogHeader>

        <ScrollFadeBody className="space-y-4 px-6 py-2">
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

          <div className="space-y-1.5">
            <Label>Account Type</Label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {ACCOUNT_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, account_type: value }))}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    form.account_type === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-starting-balance">Starting Balance</Label>
              <Input
                id="acc-starting-balance"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={form.starting_balance}
                onChange={(e) => setForm((p) => ({ ...p, starting_balance: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-interest-freq">Interest Frequency</Label>
              <Select
                value={form.interest_frequency === "" ? "none" : form.interest_frequency}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    interest_frequency: v === "none" ? "" : (v as InterestFrequency),
                  }))
                }
              >
                <SelectTrigger id="acc-interest-freq">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {INTEREST_FREQUENCY_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <Label htmlFor="acc-include-net" className="cursor-pointer text-sm">
                Include in Net Balance
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Counts this account toward the Net Balance summary and the 7-day chart on /dashboard/accounts.
              </p>
            </div>
            <ToggleSwitch
              id="acc-include-net"
              checked={form.include_in_net_balance}
              onCheckedChange={(v) => setForm((p) => ({ ...p, include_in_net_balance: v }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_TAG_PRESETS.map((tag) => {
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
            <div className="flex flex-wrap gap-1">
              {form.tags.filter((t) => !ACCOUNT_TAG_PRESETS.includes(t)).map((t) => (
                <Badge key={t} variant="secondary" className="gap-1 text-xs">
                  {t}
                  <button type="button" onClick={() => toggleTag(t)} className="ml-0.5 hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
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

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLOR_SWATCHES.map(({ label, value }) => (
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

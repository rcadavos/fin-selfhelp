"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollFadeBody } from "@/components/app/scroll-fade-body";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "@/lib/utils";
import { BANK_GROUPS, getBankLogoSlug, getBankColor } from "@/lib/constants/account-institutions";
import type { AccountRow, AccountType, InterestFrequency } from "@/actions/accounts";

export type AccountFormState = {
  account_alias: string;
  bank_name: string;
  tags: string[];
  color: string;
  account_type: AccountType;
  starting_balance: string;
  interest_frequency: InterestFrequency | "";
  interest_rate: string;
  maintaining_balance: string;
  include_in_net_balance: boolean;
  currency: string;
};

export const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
];

export const CURRENCIES: Array<{ value: string; label: string }> = [
  { value: "PHP", label: "PHP — Philippine Peso" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "HKD", label: "HKD — Hong Kong Dollar" },
  { value: "CNY", label: "CNY — Chinese Yuan" },
  { value: "KRW", label: "KRW — Korean Won" },
  { value: "THB", label: "THB — Thai Baht" },
  { value: "MYR", label: "MYR — Malaysian Ringgit" },
  { value: "IDR", label: "IDR — Indonesian Rupiah" },
  { value: "VND", label: "VND — Vietnamese Dong" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
];

export const INTEREST_FREQUENCY_OPTIONS: Array<{ value: InterestFrequency; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export const ACCOUNT_TAG_PRESETS = [
  "Cash",
  "Payroll",
  "Savings",
  "Bills",
  "Allowance",
  "Daily Expenses",
  "Groceries",
  "Wants/Leisure",
  "Emergency Fund",
  "Business",
  "Travel",
  "Healthcare",
  "Education",
  "Investments",
  "Crypto",
  "Rent & Housing",
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
  interest_rate: "",
  maintaining_balance: "",
  include_in_net_balance: true,
  currency: "PHP",
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
    interest_rate: acc.interest_rate != null ? String(acc.interest_rate) : "",
    maintaining_balance: acc.maintaining_balance != null ? String(acc.maintaining_balance) : "",
    include_in_net_balance: acc.include_in_net_balance,
    currency: acc.currency ?? "PHP",
  };
}

/** Adapt the dialog's local form state into the shape `createAccount` / `updateAccount` expect. */
export function accountFormToInput(form: AccountFormState) {
  const starting = Number(form.starting_balance);
  const rate = form.interest_rate.trim() !== "" ? Number(form.interest_rate) : null;
  const maintaining = form.maintaining_balance.trim() !== "" ? Number(form.maintaining_balance) : null;
  return {
    account_alias: form.account_alias,
    bank_name: form.bank_name,
    tags: form.tags,
    color: form.color,
    account_type: form.account_type,
    starting_balance: Number.isFinite(starting) ? starting : 0,
    interest_frequency: form.interest_frequency === "" ? null : form.interest_frequency,
    interest_rate: rate != null && Number.isFinite(rate) ? rate : null,
    maintaining_balance: maintaining != null && Number.isFinite(maintaining) ? maintaining : null,
    include_in_net_balance: form.include_in_net_balance,
    currency: form.currency || "PHP",
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

  const filteredGroups = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    if (!query) return BANK_GROUPS;
    return BANK_GROUPS
      .map((g) => ({ ...g, banks: g.banks.filter((b) => b.toLowerCase().includes(query)) }))
      .filter((g) => g.banks.length > 0);
  }, [bankSearch]);
  const showOther = !bankSearch.trim() || "other".includes(bankSearch.trim().toLowerCase());

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
          {/* Row 1: Account Alias | Account Type */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-alias">Account Alias</Label>
              <Input
                id="acc-alias"
                placeholder="e.g. Savings, Payroll"
                value={form.account_alias}
                onChange={(e) => setForm((p) => ({ ...p, account_alias: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-type">Account Type</Label>
              <Select
                value={form.account_type}
                onValueChange={(v) => setForm((p) => ({ ...p, account_type: v as AccountType }))}
              >
                <SelectTrigger id="acc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPE_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Bank / e-Wallet / Platform | Currency */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-bank">Bank / e-Wallet / Platform</Label>
              <Select
                value={form.bank_name}
                onValueChange={(v) => {
                  const bankColor = getBankColor(v);
                  setForm((p) => ({ ...p, bank_name: v, ...(bankColor ? { color: bankColor } : {}) }));
                  setBankSearch("");
                }}
              >
                <SelectTrigger id="acc-bank">
                  <SelectValue placeholder="Select bank or e-wallet">
                    {form.bank_name ? (
                      <span className="flex items-center gap-2 min-w-0">
                        {form.bank_name !== "Other" && getBankLogoSlug(form.bank_name) && (
                          <Image
                            src={`/images/bank-logo/${getBankLogoSlug(form.bank_name)}.webp`}
                            alt=""
                            width={16}
                            height={16}
                            className="flex-shrink-0 object-contain"
                          />
                        )}
                        <span className="truncate">{form.bank_name}</span>
                      </span>
                    ) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <div className="sticky top-0 z-10 bg-popover px-2 pb-2 pt-1">
                    <Input
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Search..."
                      className="h-8 text-xs"
                    />
                  </div>
                  {filteredGroups.length === 0 && !showOther ? (
                    <p className="px-2 py-2 text-xs text-muted-foreground">No results found.</p>
                  ) : (
                    <>
                      {filteredGroups.map((group, gi) => (
                        <SelectGroup key={group.label}>
                          {gi > 0 && <SelectSeparator />}
                          <SelectLabel className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <span className="h-px flex-1 bg-border" />
                            {group.label}
                            <span className="h-px flex-1 bg-border" />
                          </SelectLabel>
                          {group.banks.map((b: string) => (
                            <SelectItem key={b} value={b}>
                              <span className="flex items-center gap-2">
                                {getBankLogoSlug(b) && (
                                  <Image
                                    src={`/images/bank-logo/${getBankLogoSlug(b)}.webp`}
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="flex-shrink-0 object-contain"
                                  />
                                )}
                                {b}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                      {showOther && (
                        <SelectGroup>
                          <SelectSeparator />
                          <SelectLabel className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <span className="h-px flex-1 bg-border" />
                            Other
                            <span className="h-px flex-1 bg-border" />
                          </SelectLabel>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectGroup>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-currency">Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}
              >
                <SelectTrigger id="acc-currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Starting Balance | Maintaining Balance */}
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
              <Label htmlFor="acc-maintaining-balance">
                Maintaining Balance
              </Label>
              <Input
                id="acc-maintaining-balance"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="Optional min. balance"
                value={form.maintaining_balance}
                onChange={(e) => setForm((p) => ({ ...p, maintaining_balance: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">

            <div className="space-y-1.5">
              <Label htmlFor="acc-interest-freq">Interest Frequency</Label>
              <Select
                value={form.interest_frequency === "" ? "none" : form.interest_frequency}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    interest_frequency: v === "none" ? "" : (v as InterestFrequency),
                    interest_rate: v === "none" ? "" : p.interest_rate,
                  }))
                }
              >
                <SelectTrigger id="acc-interest-freq">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {INTEREST_FREQUENCY_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-interest-rate">
                Interest Rate <span className="text-muted-foreground">(%)</span>
              </Label>
              <Input
                id="acc-interest-rate"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="e.g. 1.5"
                value={form.interest_rate}
                disabled={form.interest_frequency === ""}
                onChange={(e) => setForm((p) => ({ ...p, interest_rate: e.target.value }))}
              />
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

          {(form.bank_name === "" || form.bank_name === "Other") && (
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
          )}

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

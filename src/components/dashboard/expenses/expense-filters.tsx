"use client";

import { Search, Wallet, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_ACCOUNT_FILTER } from "@/lib/constants/expenses";
import { cn } from "@/lib/utils";

export type ExpenseAccountOption = { value: string; label: string };

/**
 * The row above the list: a search box, which account paid, and "Large only" for
 * the few entries that actually moved the month. The account and large filters
 * only appear when they would narrow anything.
 */
export function ExpenseFilters({
  search,
  onSearchChange,
  searchPlaceholder,
  accountOptions,
  accountValue,
  onAccountChange,
  showLargeFilter,
  largeOnly,
  onLargeOnlyChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** Accounts used this month. The picker shows only with two or more. */
  accountOptions: ExpenseAccountOption[];
  accountValue: string;
  onAccountChange: (value: string) => void;
  showLargeFilter: boolean;
  largeOnly: boolean;
  onLargeOnlyChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="surface relative flex h-11 min-w-0 flex-[1_1_16rem] items-center gap-2 border border-border bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="sr-only">Search expenses</span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="tap-target -mr-1 flex size-7 shrink-0 items-center justify-center rounded-full hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </label>

      {accountOptions.length > 1 && (
        <Select value={accountValue} onValueChange={onAccountChange}>
          <SelectTrigger
            aria-label="Account"
            className="h-11 w-auto min-w-0 max-w-[15rem] gap-2 rounded-[0.875rem] border-border bg-card focus:ring-offset-0"
          >
            <Wallet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value={EXPENSE_ACCOUNT_FILTER.all}>All accounts</SelectItem>
            {accountOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showLargeFilter && (
        <button
          type="button"
          aria-pressed={largeOnly}
          onClick={() => onLargeOnlyChange(!largeOnly)}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            largeOnly
              ? "border-primary bg-primary/[0.07] font-medium text-primary"
              : "border-border bg-card text-foreground hover:border-hairline-strong hover:bg-muted/50",
          )}
        >
          <i
            aria-hidden
            className={cn("size-2 rounded-full border-[1.5px] border-primary", largeOnly && "bg-primary")}
          />
          Large only
        </button>
      )}
    </div>
  );
}

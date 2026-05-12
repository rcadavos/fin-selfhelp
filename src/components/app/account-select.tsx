"use client";

import { useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getBankLogoSlug } from "@/lib/constants/account-institutions";
import type { AccountRow } from "@/actions/accounts";

const LAST_ACCOUNT_NAMES = ["borrowed"];

function sortAccounts(accounts: AccountRow[]): AccountRow[] {
  return [...accounts].sort((a, b) => {
    const aIsCash = a.account_alias.toLowerCase() === "cash";
    const bIsCash = b.account_alias.toLowerCase() === "cash";
    if (aIsCash !== bIsCash) return aIsCash ? -1 : 1;
    const aLast = LAST_ACCOUNT_NAMES.includes(a.account_alias.toLowerCase()) ? 1 : 0;
    const bLast = LAST_ACCOUNT_NAMES.includes(b.account_alias.toLowerCase()) ? 1 : 0;
    if (aLast !== bLast) return aLast - bLast;
    return a.account_alias.localeCompare(b.account_alias);
  });
}

function AccountIcon({ account }: { account: AccountRow }) {
  const slug = getBankLogoSlug(account.bank_name);
  if (slug) {
    return (
      <Image
        src={`/images/bank-logo/${slug}.webp`}
        alt={account.bank_name}
        width={18}
        height={18}
        className="flex-shrink-0 rounded object-contain"
        unoptimized
      />
    );
  }
  return (
    <span
      className="h-[18px] w-[18px] flex-shrink-0 rounded-md"
      style={{ backgroundColor: account.color }}
    />
  );
}

export function AccountSelect({
  accounts,
  value,
  onChange,
  id,
  placeholder = "Select account",
  allowClear = false,
  triggerClassName,
}: {
  accounts: AccountRow[];
  value: string;
  onChange: (id: string) => void;
  id?: string;
  placeholder?: string;
  /** When true, an explicit "— None —" entry lets users clear the selection. */
  allowClear?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const sorted = useMemo(() => sortAccounts(accounts), [accounts]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((a) =>
      a.account_alias.toLowerCase().includes(q) ||
      a.bank_name.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [sorted, query]);

  const selected = accounts.find((a) => a.id === value) ?? null;

  function handleSelect(nextId: string) {
    onChange(nextId);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
        else queueMicrotask(() => searchInputRef.current?.focus());
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-auto min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            triggerClassName,
          )}
        >
          {selected ? (
            <div className="flex min-w-0 items-center gap-2">
              <AccountIcon account={selected} />
              <span className="truncate text-sm font-medium">{selected.account_alias}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] min-w-[14rem] p-0"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
          <Input
            ref={searchInputRef}
            id={inputId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts…"
            className="h-9 border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div role="listbox" className="max-h-64 overflow-y-auto p-1">
          {allowClear && (
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => handleSelect("")}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                value === "" && "bg-accent/60",
              )}
            >
              <span className="text-muted-foreground">— None —</span>
              {value === "" && <Check className="h-4 w-4 opacity-70" aria-hidden />}
            </button>
          )}
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No accounts match “{query}”.
            </p>
          ) : (
            filtered.map((acc) => (
              <button
                key={acc.id}
                type="button"
                role="option"
                aria-selected={value === acc.id}
                onClick={() => handleSelect(acc.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === acc.id && "bg-accent/60",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <AccountIcon account={acc} />
                  <span className="truncate">{acc.account_alias}</span>
                </span>
                {value === acc.id && <Check className="h-4 w-4 opacity-70" aria-hidden />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

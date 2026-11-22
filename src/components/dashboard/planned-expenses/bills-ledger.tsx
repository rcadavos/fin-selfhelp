"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LEDGER_FILTERS, LEDGER_GRID_COLS } from "@/lib/constants/planned-expenses";
import type { LedgerFilter } from "@/lib/planned-expenses/grouping";

/** What the ledger's fourth column holds on a wide screen, if anything. */
export type LedgerDetailColumn = "account" | "reminder" | null;

const DETAIL_COLUMN_LABEL: Record<Exclude<LedgerDetailColumn, null>, string> = {
  account: "Account",
  reminder: "Reminder",
};

/**
 * The frame around the bill groups. It is a size container: once the ledger itself
 * is 42rem wide (`@2xl`) it becomes one card with filter tabs, search and a column
 * header, and every row lays out as a table row. Narrower than that — a phone, a
 * tablet, or a laptop where the rail takes the room — it renders exactly as the
 * stacked list always has, with no toolbar.
 *
 * The rows themselves read the same container, so they switch layouts in step.
 */
export function BillsLedger({
  filter,
  onFilterChange,
  counts,
  query,
  onQueryChange,
  detailColumn,
  emptyMessage,
  children,
}: {
  filter: LedgerFilter;
  onFilterChange: (filter: LedgerFilter) => void;
  counts: Record<LedgerFilter, number>;
  query: string;
  onQueryChange: (query: string) => void;
  detailColumn: LedgerDetailColumn;
  /** Shown in place of the groups when the filter or search leaves nothing. */
  emptyMessage: string | null;
  children: React.ReactNode;
}) {
  const gridCols = detailColumn ? LEDGER_GRID_COLS.withDetail : LEDGER_GRID_COLS.plain;

  return (
    <section aria-label="Bills" className="@container">
      <div className="@2xl:overflow-hidden @2xl:rounded-[0.875rem] @2xl:border @2xl:border-border @2xl:bg-card @2xl:shadow-[var(--shadow)]">
        <div className="hidden flex-wrap items-center justify-between gap-2.5 border-b border-border px-3.5 py-3 @2xl:flex">
          <div role="group" aria-label="Show bills" className="inline-flex gap-0.5 rounded-[10px] bg-muted p-[3px]">
            {LEDGER_FILTERS.map(({ id, label }) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onFilterChange(id)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  <span className="font-mono text-[11px] opacity-70">{counts[id]}</span>
                </button>
              );
            })}
          </div>
          <label className="relative block w-56 max-w-full">
            <span className="sr-only">Search bills</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search bills"
              className="h-9 rounded-[10px] pl-8 text-sm md:text-sm"
            />
          </label>
        </div>

        <div
          className={cn(
            "hidden items-center gap-x-3 border-b border-border bg-muted/40 py-2 pl-4 pr-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground @2xl:grid",
            gridCols,
          )}
          aria-hidden
        >
          <span />
          <span>Bill</span>
          <span>Status</span>
          {detailColumn && <span>{DETAIL_COLUMN_LABEL[detailColumn]}</span>}
          <span className="text-right">Amount</span>
          <span />
        </div>

        {emptyMessage ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col gap-5 @2xl:gap-0">{children}</div>
        )}
      </div>
    </section>
  );
}

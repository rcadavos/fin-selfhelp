"use client";

import { Amount } from "@/components/passbook/amount";
import { cn } from "@/lib/utils";
import type { CategoryTotal } from "@/lib/expenses/pace";

/**
 * The category breakdown, as a filter.
 *
 * This replaces the pie chart, which answered a year-end question on a page you
 * open to log a coffee — and was collapsed by default on mobile anyway. The chips
 * carry the same totals the pie did and also narrow the list, so the space earns
 * its place twice. The full breakdown still lives on /dashboard/expenses/categories.
 */
export function CategoryFilterStrip({
  totals,
  colorFor,
  monthTotal,
  currency,
  activeId,
  onSelect,
}: {
  totals: CategoryTotal[];
  colorFor: (categoryId: string) => string;
  monthTotal: number;
  currency: string;
  /** Null means "All". */
  activeId: string | null;
  onSelect: (categoryId: string | null) => void;
}) {
  if (totals.length === 0) return null;

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <button
        type="button"
        aria-pressed={activeId === null}
        onClick={() => onSelect(null)}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
          activeId === null
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground hover:border-hairline-strong",
        )}
      >
        All
        <Amount
          value={monthTotal}
          currency={currency}
          className={cn("text-[11.5px]", activeId === null ? "text-primary" : "text-muted-foreground")}
        />
      </button>

      {totals.map((cat) => {
        const active = activeId === cat.id;
        return (
          <button
            key={cat.id || "uncategorized"}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? null : cat.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-2.5 pr-3 text-[12.5px] transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:border-hairline-strong",
            )}
          >
            <i
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: colorFor(cat.id) }}
            />
            {cat.label}
            <Amount
              value={cat.total}
              currency={currency}
              className={cn("text-[11.5px]", active ? "text-primary" : "text-muted-foreground")}
            />
          </button>
        );
      })}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { cn } from "@/lib/utils";
import type { CategoryTotal } from "@/lib/expenses/pace";

function shareLabel(total: number, monthTotal: number): string {
  const pct = monthTotal > 0 ? (total / monthTotal) * 100 : 0;
  return pct > 0 && pct < 1 ? "<1%" : `${Math.round(pct)}%`;
}

function entriesLabel(count: number): string {
  return `${count} ${count === 1 ? "entry" : "entries"}`;
}

function CategoryButton({
  active,
  onClick,
  marker,
  label,
  detail,
  total,
  currency,
}: {
  active: boolean;
  onClick: () => void;
  marker: ReactNode;
  label: string;
  /** The share and entry count, shown from tablet width up. */
  detail: string;
  total: number;
  currency: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        // A phone gets a 44px chip in a sideways-scrolling row; wider screens get a card in a grid.
        "inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "sm:h-auto sm:min-h-14 sm:min-w-0 sm:gap-2.5 sm:rounded-[10px] sm:px-3 sm:py-2 sm:text-left",
        active
          ? "border-primary bg-primary/[0.07] text-primary"
          : "border-border bg-card text-foreground hover:border-hairline-strong hover:bg-muted/50",
      )}
    >
      {marker}
      <span className="min-w-0 sm:flex-1">
        <span className={cn("block truncate sm:text-[13.5px]", active ? "font-semibold" : "font-medium")}>
          {label}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:block">{detail}</span>
      </span>
      <Amount
        value={total}
        currency={currency}
        className={cn("text-xs sm:text-sm", active ? "text-primary" : "text-muted-foreground sm:text-foreground")}
      />
    </button>
  );
}

/**
 * Where the month's money went: one bar split by category, then a button per
 * category with its total, share and entry count. The buttons also narrow the
 * list below, so the breakdown earns its place twice. The full year-by-year view
 * lives on /dashboard/expenses/categories.
 */
export function CategoryBreakdown({
  totals,
  colorFor,
  monthTotal,
  entryCount,
  currency,
  activeId,
  onSelect,
}: {
  totals: CategoryTotal[];
  colorFor: (categoryId: string) => string;
  monthTotal: number;
  entryCount: number;
  currency: string;
  /** Null means "All". */
  activeId: string | null;
  onSelect: (categoryId: string | null) => void;
}) {
  if (totals.length === 0) return null;

  return (
    <section
      aria-labelledby="expenses-where-it-went"
      className="surface flex flex-col gap-4 border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="expenses-where-it-went" className="text-base font-semibold tracking-tight">
          Where it went
        </h2>
        <Link
          href="/dashboard/expenses/categories"
          className="-my-2 inline-flex min-h-11 items-center gap-1 rounded-md text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          All categories
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div
        role="img"
        aria-label={`Share of spending: ${totals
          .map((t) => `${t.label} ${shareLabel(t.total, monthTotal)}`)
          .join(", ")}`}
        className="-mt-1 flex h-3 gap-0.5 overflow-hidden rounded-md"
      >
        {totals.map((t) => (
          <span
            key={t.id || "uncategorized"}
            className="h-full min-w-[3px]"
            style={{ flexGrow: t.total, flexBasis: 0, backgroundColor: colorFor(t.id) }}
          />
        ))}
      </div>

      <div
        role="group"
        aria-label="Show expenses by category"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3"
      >
        <CategoryButton
          active={activeId === null}
          onClick={() => onSelect(null)}
          marker={
            <span aria-hidden className="grid size-3 shrink-0 grid-cols-2 gap-[2px]">
              {totals.slice(0, 4).map((t) => (
                <i
                  key={t.id || "uncategorized"}
                  className="rounded-[1px]"
                  style={{ backgroundColor: colorFor(t.id) }}
                />
              ))}
            </span>
          }
          label="All spending"
          detail={entriesLabel(entryCount)}
          total={monthTotal}
          currency={currency}
        />
        {totals.map((cat) => {
          const active = activeId === cat.id;
          return (
            <CategoryButton
              key={cat.id || "uncategorized"}
              active={active}
              onClick={() => onSelect(active ? null : cat.id)}
              marker={
                <i
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorFor(cat.id) }}
                />
              }
              label={cat.label}
              detail={`${shareLabel(cat.total, monthTotal)} • ${entriesLabel(cat.count)}`}
              total={cat.total}
              currency={currency}
            />
          );
        })}
      </div>
    </section>
  );
}

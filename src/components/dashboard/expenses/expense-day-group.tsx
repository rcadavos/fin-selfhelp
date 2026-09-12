"use client";

import { Car, Trash2 } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import { cn } from "@/lib/utils";
import type { ExpenseEntryRow } from "@/actions/budget";
import type { AccountRow } from "@/actions/accounts";
import type { VehicleRow } from "@/actions/vehicles";
import type { ExpenseDayGroup } from "@/lib/expenses/pace";

export function formatDayLabel(dateYmd: string, today = new Date()): string {
  const d = new Date(`${dateYmd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateYmd;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-PH", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * One day of spending: a heading carrying the day's own total, a bar showing that
 * day against the month's heaviest, then the entries.
 *
 * The old board grouped by day already but printed only the date, so the one
 * number that makes a day scannable — what it cost — was the one left out.
 */
export function ExpenseDayGroupCard({
  group,
  maxDayTotal,
  currency,
  largeThreshold,
  nameFor,
  categoryLabelFor,
  colorFor,
  accountMap,
  vehicleMap,
  vehicleColorMap,
  onEdit,
  onDelete,
}: {
  group: ExpenseDayGroup;
  /** The heaviest day on screen, so each bar is relative to what you can see. */
  maxDayTotal: number;
  currency: string;
  largeThreshold: number;
  nameFor: (entry: ExpenseEntryRow) => string;
  categoryLabelFor: (categoryId: string) => string;
  colorFor: (categoryId: string) => string;
  accountMap: Record<string, AccountRow>;
  vehicleMap: Record<string, VehicleRow>;
  vehicleColorMap: Record<string, string>;
  onEdit: (entry: ExpenseEntryRow) => void;
  onDelete: (entryId: string) => void;
}) {
  const sharePct = maxDayTotal > 0 ? (group.total / maxDayTotal) * 100 : 0;

  return (
    <section className="flex flex-col">
      <div className="flex items-baseline px-0.5 pb-1.5">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {formatDayLabel(group.dateYmd)}
        </span>
        <DotLeader />
        <Amount value={group.total} currency={currency} className="pb-px text-[12.5px]" />
      </div>

      <div className="mx-0.5 mb-1.5 h-[3px] overflow-hidden rounded-full bg-muted">
        <i
          className="block h-full rounded-full bg-primary/55 transition-[width] duration-500"
          style={{ width: `${sharePct}%` }}
        />
      </div>

      <div className="surface overflow-hidden border border-border bg-card">
        <div className="divide-y divide-border">
          {group.entries.map((entry) => {
            const isOptimistic = entry.id.startsWith("optimistic-");
            const isLarge = largeThreshold > 0 && entry.amount >= largeThreshold;
            const account = entry.account_id ? accountMap[entry.account_id] : undefined;
            const vehicle = entry.vehicle_id ? vehicleMap[entry.vehicle_id] : undefined;
            const vehicleColor = entry.vehicle_id ? vehicleColorMap[entry.vehicle_id] : undefined;

            return (
              <div
                key={entry.id}
                role="button"
                tabIndex={isOptimistic ? -1 : 0}
                onClick={() => { if (!isOptimistic) onEdit(entry); }}
                onKeyDown={(e) => {
                  if (isOptimistic) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onEdit(entry);
                  }
                }}
                className={cn(
                  "relative flex items-center gap-2.5 px-3 py-2.5 pl-4 transition-colors",
                  "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-['']",
                  isLarge ? "before:bg-primary/70" : "before:bg-primary/25",
                  isOptimistic
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                )}
              >
                <i
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colorFor(entry.category_id) }}
                />

                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm", isLarge ? "font-semibold" : "font-medium")}>
                    {nameFor(entry)}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-muted-foreground">
                    <span>{categoryLabelFor(entry.category_id)}</span>
                    {vehicle && vehicleColor && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-px font-mono text-[9.5px]"
                        style={{ backgroundColor: `${vehicleColor}22`, color: vehicleColor }}
                      >
                        <Car className="size-2.5" aria-hidden />
                        {vehicle.name}
                      </span>
                    )}
                    {account && (
                      <span
                        className="rounded-full px-2 py-px font-mono text-[9.5px]"
                        style={{ backgroundColor: `${account.color}22`, color: account.color }}
                      >
                        {account.account_alias}
                      </span>
                    )}
                  </div>
                </div>

                <Amount
                  value={entry.amount}
                  currency={currency}
                  className={cn("shrink-0", isLarge ? "text-[15.5px] font-semibold" : "text-sm")}
                />

                <button
                  type="button"
                  disabled={isOptimistic}
                  aria-label={`Delete ${nameFor(entry)}`}
                  onClick={(e) => { e.stopPropagation(); if (!isOptimistic) onDelete(entry.id); }}
                  className="tap-target flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

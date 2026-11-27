import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/passbook/amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import { Stamp } from "@/components/passbook/stamp";
import { SPEND_CATEGORY_ICONS } from "@/components/dashboard/vehicles/vehicle-identity";
import { cn } from "@/lib/utils";
import type { VehicleSpendEntry } from "@/actions/vehicles";
import {
  dayHeading,
  entryName,
  spendCategoryLabel,
  spendCategoryOf,
  spendDayGroups,
} from "@/lib/vehicles/spending";

function HistoryRow({ entry, currency }: { entry: VehicleSpendEntry; currency: string }) {
  const key = spendCategoryOf(entry);
  const Icon = SPEND_CATEGORY_ICONS[key];
  const isBill = entry.source === "bill";
  // An entry with no name of its own is already called by its category.
  const category = entry.label ? spendCategoryLabel(key) : null;

  const body = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{entryName(entry)}</span>
        {(category || isBill) && (
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-muted-foreground">
            {category && <span>{category}</span>}
            {isBill && (
              <Stamp variant="paid" className="px-1.5 py-px text-[9px]">
                Bill paid
              </Stamp>
            )}
          </span>
        )}
      </span>
      <Amount value={entry.amount} currency={currency} className="shrink-0 text-sm" />
    </>
  );

  if (isBill && entry.billId) {
    return (
      <li>
        <Link
          href={`/dashboard/bills/${entry.billId}`}
          className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {body}
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      </li>
    );
  }
  return <li className="flex items-center gap-3 px-3 py-2.5">{body}</li>;
}

/**
 * The month on one vehicle, a day at a time: each day carries its own total, and
 * bill payments sit among the expenses with a stamp and a link to their bill.
 */
export function VehicleHistory({
  entries,
  monthLabel,
  currency,
  onAddExpense,
  className,
}: {
  /** The month's entries, newest first. */
  entries: VehicleSpendEntry[];
  monthLabel: string;
  currency: string;
  onAddExpense: () => void;
  className?: string;
}) {
  const groups = spendDayGroups(entries);

  return (
    <section aria-labelledby="vehicle-history-heading" className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 id="vehicle-history-heading" className="text-[13.5px] font-semibold">
          History
        </h2>
        <span className="text-[11.5px] text-muted-foreground">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} in {monthLabel}
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="surface flex flex-col items-center gap-1.5 border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium">Nothing recorded in {monthLabel}</p>
          <p className="max-w-[44ch] text-xs leading-relaxed text-muted-foreground">
            Add a fuel-up, a repair or a toll for this vehicle, or link a Transport bill to it, and it shows up here.
          </p>
          <Button variant="outline" onClick={onAddExpense} className="mt-3 gap-1.5">
            <Plus className="size-4" aria-hidden />
            Add expense
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.dateYmd}>
              <div className="flex items-baseline px-0.5 pb-1.5">
                <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  {dayHeading(group.dateYmd)}
                </span>
                <DotLeader />
                <Amount value={group.total} currency={currency} className="pb-px text-[12.5px]" />
              </div>
              <ul className="surface divide-y divide-border overflow-hidden border border-border bg-card">
                {group.entries.map((entry) => (
                  <HistoryRow key={`${entry.source}-${entry.id}`} entry={entry} currency={currency} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

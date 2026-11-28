"use client";

import { Car, ChevronDown, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Amount } from "@/components/passbook/amount";
import { DotLeader } from "@/components/passbook/dot-leader";
import { Stamp } from "@/components/passbook/stamp";
import { NotesPreview } from "@/components/app/notes-field";
import { BUSY_DAY_MULTIPLE } from "@/lib/constants/expenses";
import {
  EXPENSE_CATEGORY_ICONS,
  FALLBACK_EXPENSE_CATEGORY_ICON,
} from "@/lib/constants/expense-category-icons";
import { isLargeEntry, type ExpenseDayGroup } from "@/lib/expenses/pace";
import { cn } from "@/lib/utils";
import type { ExpenseEntryRow } from "@/actions/budget";
import type { AccountRow } from "@/actions/accounts";
import type { VehicleRow } from "@/actions/vehicles";

function parseYmd(dateYmd: string): Date {
  return new Date(`${dateYmd}T00:00:00`);
}

/** "Today", "Yesterday", or "Thu, 26 Nov". */
export function formatDayLabel(dateYmd: string, today = new Date()): string {
  const d = parseYmd(dateYmd);
  if (Number.isNaN(d.getTime())) return dateYmd;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return formatDayDate(dateYmd);
}

/** "Sat, 28 Nov". */
export function formatDayDate(dateYmd: string): string {
  const d = parseYmd(dateYmd);
  if (Number.isNaN(d.getTime())) return dateYmd;
  return d.toLocaleDateString("en-PH", { weekday: "short", day: "numeric", month: "short" });
}

/** "1–24 Nov", or "24 Nov" for a single day. Both days fall in the same month. */
export function formatDayRange(oldestYmd: string, newestYmd: string): string {
  const newest = parseYmd(newestYmd);
  if (Number.isNaN(newest.getTime())) return `${oldestYmd}–${newestYmd}`;
  const month = newest.toLocaleDateString("en-PH", { month: "short" });
  const first = Number(oldestYmd.slice(8, 10));
  const last = newest.getDate();
  return first === last ? `${last} ${month}` : `${first}–${last} ${month}`;
}

function entriesLabel(count: number): string {
  return `${count} ${count === 1 ? "entry" : "entries"}`;
}

/** The days folded behind the "Show earlier" button. */
export type HiddenDaysSummary = {
  /** "1–24 Nov". */
  label: string;
  entryCount: number;
  total: number;
};

type RowLookups = {
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
};

function ExpenseLedgerRow({
  entry,
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
}: RowLookups & { entry: ExpenseEntryRow }) {
  const isOptimistic = entry.id.startsWith("optimistic-");
  const isLarge = isLargeEntry(entry.amount, largeThreshold);
  const name = nameFor(entry);
  const color = colorFor(entry.category_id);
  const Icon = EXPENSE_CATEGORY_ICONS[entry.category_id] ?? FALLBACK_EXPENSE_CATEGORY_ICON;
  const account = entry.account_id ? accountMap[entry.account_id] : undefined;
  const vehicle = entry.vehicle_id ? vehicleMap[entry.vehicle_id] : undefined;
  const vehicleColor = entry.vehicle_id ? vehicleColorMap[entry.vehicle_id] : undefined;

  return (
    <li
      className={cn(
        "relative flex min-h-16 items-center gap-3 border-t border-border py-2 pl-4 pr-1.5 transition-colors sm:gap-3.5 sm:pl-5 sm:pr-2",
        isOptimistic ? "opacity-60" : "hover:bg-accent/40",
      )}
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-[9px]"
        style={{ backgroundColor: `${color}24`, color }}
      >
        <Icon className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-[0_1_auto]">
        <p className={cn("text-[15px] leading-5", isLarge ? "font-semibold" : "font-medium")}>
          {/* Stretched over the whole row, so anywhere on it opens the entry. The menu sits above it. */}
          <button
            type="button"
            onClick={() => onEdit(entry)}
            disabled={isOptimistic}
            className="block max-w-full truncate text-left outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring disabled:cursor-not-allowed"
          >
            {name}
          </button>
        </p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] leading-[18px] text-muted-foreground">
          {isLarge && <Stamp variant="paid" className="px-1.5 py-px text-[9.5px] sm:hidden">Large</Stamp>}
          <span className="min-w-0 truncate">
            {categoryLabelFor(entry.category_id)}
            {account && (
              <>
                {" "}
                <span aria-hidden>•</span> {account.account_alias}
              </>
            )}
          </span>
          {vehicle && vehicleColor && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-px font-mono text-[9.5px]"
              style={{ backgroundColor: `${vehicleColor}22`, color: vehicleColor }}
            >
              <Car className="size-2.5" aria-hidden />
              {vehicle.name}
            </span>
          )}
        </div>
        {/* Skipped when the notes already stand in as the name (no label set). */}
        {entry.notes?.trim() !== name && <NotesPreview notes={entry.notes} />}
      </div>

      {isLarge && (
        <Stamp variant="paid" className="hidden shrink-0 sm:inline-flex">
          Large
        </Stamp>
      )}
      <DotLeader className="mb-0 self-center" />
      <Amount
        value={entry.amount}
        currency={currency}
        className={cn("shrink-0", isLarge ? "text-base font-semibold sm:text-[17px]" : "text-[15px] sm:text-base")}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isOptimistic}
            aria-label={`Options for ${name}`}
            className="relative z-10 -ml-1.5 size-11 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <MoreVertical aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="cursor-pointer" onSelect={() => onEdit(entry)}>
            <Pencil className="h-4 w-4" aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => onDelete(entry.id)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/**
 * The month's expenses as one ledger: a heading per day carrying the day's total,
 * then its entries with the category icon, the account that paid, and the amount
 * at the end of a dot leader. A day well above the daily average says so, and
 * entries that moved the month get a Large stamp. Tap a row to edit it; delete
 * lives in its menu, so a stray tap cannot remove anything. Older days fold
 * behind a button at the bottom.
 */
export function ExpenseLedger({
  groups,
  hidden,
  onShowEarlier,
  busyAverage,
  ...lookups
}: RowLookups & {
  groups: ExpenseDayGroup[];
  /** Days folded away, or null when every day is showing. */
  hidden: HiddenDaysSummary | null;
  onShowEarlier: () => void;
  /** The daily average to call busy days out against, or null to leave the notes off. */
  busyAverage: number | null;
}) {
  const { currency } = lookups;

  return (
    <section aria-label="Expenses by day" className="surface overflow-hidden border border-border bg-card">
      {groups.map((group, index) => {
        const label = formatDayLabel(group.dateYmd);
        const isRelative = label === "Today" || label === "Yesterday";
        const ratio = busyAverage && busyAverage > 0 ? group.total / busyAverage : 0;

        return (
          <section key={group.dateYmd} aria-label={`${label}, ${entriesLabel(group.entries.length)}`}>
            {/* The right padding lines the day's total up with the amounts in its rows. */}
            <div
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-0.5 bg-muted py-2.5 pl-4 pr-14 sm:pl-5 sm:pr-[3.75rem]",
                index > 0 && "border-t border-border",
              )}
            >
              <h3 className="min-w-0 flex-1 truncate text-xs font-semibold uppercase leading-[18px] tracking-[0.06em] text-muted-foreground">
                {label}
                <span className="font-normal normal-case tracking-normal">
                  {isRelative && (
                    <>
                      {" "}
                      <span aria-hidden>•</span> {formatDayDate(group.dateYmd)}
                    </>
                  )}
                  <span className="hidden sm:inline">
                    {" "}
                    <span aria-hidden>•</span> {entriesLabel(group.entries.length)}
                  </span>
                </span>
              </h3>
              {ratio >= BUSY_DAY_MULTIPLE && (
                <span className="order-last basis-full text-xs leading-[18px] text-warning sm:order-none sm:basis-auto">
                  {ratio.toFixed(1)}× your daily average
                </span>
              )}
              <Amount value={group.total} currency={currency} className="text-[13px] text-foreground/80" />
            </div>
            <ul>
              {group.entries.map((entry) => (
                <ExpenseLedgerRow key={entry.id} entry={entry} {...lookups} />
              ))}
            </ul>
          </section>
        );
      })}

      {hidden && (
        <button
          type="button"
          onClick={onShowEarlier}
          className="flex min-h-14 w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-t-[3px] border-double border-hairline-strong px-4 py-3 text-sm font-medium text-primary outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="inline-flex items-center gap-1.5">
            Show {hidden.label}
            <ChevronDown className="size-4" aria-hidden />
          </span>
          <span className="font-normal text-muted-foreground">
            {entriesLabel(hidden.entryCount)} <span aria-hidden>•</span>{" "}
            <Amount value={hidden.total} currency={currency} />
          </span>
        </button>
      )}
    </section>
  );
}

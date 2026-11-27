import { Amount } from "@/components/passbook/amount";
import { SPEND_CATEGORY_ICONS } from "@/components/dashboard/vehicles/vehicle-identity";
import { cn } from "@/lib/utils";
import type { SpendCategoryTotal } from "@/lib/vehicles/spending";

function shareLabel(pct: number): string {
  if (pct >= 99.5) return "100%";
  if (pct > 0 && pct < 1) return "<1%";
  return `${Math.round(pct)}%`;
}

/**
 * Where the month's vehicle money went, largest category first: fuel, repairs,
 * insurance, tolls. Each category has its own icon, so the list reads without
 * colour, and its bar is its share of the month.
 */
export function VehicleCategoryBreakdown({
  categories,
  total,
  monthLabel,
  currency,
  emptyHint,
  className,
}: {
  categories: SpendCategoryTotal[];
  total: number;
  monthLabel: string;
  currency: string;
  /** Shown when nothing was spent this month. */
  emptyHint: string;
  className?: string;
}) {
  return (
    <section
      aria-label={`Where it went in ${monthLabel}`}
      className={cn("surface border border-border bg-card px-4 pb-4 pt-3.5 shadow-[var(--shadow)]", className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[13.5px] font-semibold">Where it went</h2>
        <span className="text-[11.5px] text-muted-foreground">{monthLabel}</span>
      </div>

      {categories.length === 0 ? (
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul>
          {categories.map((c) => {
            const Icon = SPEND_CATEGORY_ICONS[c.key];
            const pct = total > 0 ? (c.total / total) * 100 : 0;
            return (
              <li key={c.key} className="mt-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{c.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {c.count} {c.count === 1 ? "entry" : "entries"} • {shareLabel(pct)}
                    </span>
                  </span>
                  <Amount value={c.total} currency={currency} className="shrink-0 text-[12.5px]" />
                </div>
                <div className="ml-[38px] mt-1.5 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <i
                    className="block h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

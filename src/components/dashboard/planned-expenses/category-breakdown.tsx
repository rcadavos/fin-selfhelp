import { Amount } from "@/components/passbook/amount";
import { cn } from "@/lib/utils";

export type CategoryBreakdownItem = {
  id: string;
  label: string;
  color: string;
  total: number;
  paid: number;
  count: number;
};

/**
 * Where the month's bills go, largest category first, with how much of each is
 * already paid. It sits in the wide-screen rail; on a phone the Categories button
 * in the header opens the same numbers in a dialog.
 */
export function CategoryBreakdown({
  items,
  moreCount,
  onShowAll,
  currency,
  className,
}: {
  items: CategoryBreakdownItem[];
  /** Categories left out of `items`. */
  moreCount: number;
  onShowAll: () => void;
  currency: string;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Bills by category"
      className={cn("surface border border-border bg-card px-4 pb-3 pt-3.5 shadow-[var(--shadow)]", className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[13.5px] font-semibold">By category</h2>
        {moreCount > 0 && (
          <button
            type="button"
            onClick={onShowAll}
            className="rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-primary transition-colors hover:bg-accent"
          >
            See all • {moreCount} more
          </button>
        )}
      </div>
      <ul className="mt-1">
        {items.map((item) => {
          const pct = item.total > 0 ? Math.round((item.paid / item.total) * 100) : 0;
          return (
            <li key={item.id} className="mt-3">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {item.label}
                  <span className="text-[11.5px] text-muted-foreground">
                    {" "}• {item.count} bill{item.count === 1 ? "" : "s"}
                  </span>
                </span>
                <Amount value={item.total} currency={currency} className="shrink-0 text-[12.5px]" />
              </div>
              <div
                className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${pct}% of ${item.label} paid`}
              >
                <i className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

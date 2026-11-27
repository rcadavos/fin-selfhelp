import Link from "next/link";
import { Receipt } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { cn } from "@/lib/utils";
import type { VehicleLinkedBill } from "@/actions/vehicles";
import { VEHICLE_BILL_PERIOD_LABELS } from "@/lib/constants/vehicles";
import { monthlyCost, spendCategoryLabel, spendCategoryOf } from "@/lib/vehicles/spending";

/**
 * The bills tied to this vehicle (insurance, a car loan, registration) with what
 * they cost a month between them, so the fixed cost of keeping it sits beside the
 * month's fuel and repairs. A bill whose end date has passed stays listed, marked
 * Ended, and leaves the monthly figure.
 */
export function VehicleLinkedBills({
  bills,
  currentMonth,
  currency,
  className,
}: {
  bills: VehicleLinkedBill[];
  /** Today's month (YYYY-MM); a bill that ended before it no longer counts. */
  currentMonth: string;
  currency: string;
  className?: string;
}) {
  const isEnded = (b: VehicleLinkedBill) => !!b.end_date && b.end_date.slice(0, 7) < currentMonth;
  const active = bills.filter((b) => !isEnded(b));
  const perMonth = active.reduce((sum, b) => sum + monthlyCost(b.amount, b.billing_period), 0);

  return (
    <section
      aria-labelledby="vehicle-bills-heading"
      className={cn("surface border border-border bg-card px-4 pb-3 pt-3.5 shadow-[var(--shadow)]", className)}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="vehicle-bills-heading" className="text-[13.5px] font-semibold">
          Linked bills
        </h2>
        {active.length > 0 && (
          <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">
            about <Amount value={Math.round(perMonth)} currency={currency} className="text-foreground" /> a month
          </span>
        )}
      </div>

      {bills.length === 0 ? (
        <p className="mt-2 pb-1 text-[12.5px] leading-relaxed text-muted-foreground">
          No bills linked yet. Link a Transport bill, such as insurance or a car loan, to this vehicle and its
          payments count here.{" "}
          <Link href="/dashboard/bills" className="font-medium text-primary hover:underline">
            Go to Bills
          </Link>
        </p>
      ) : (
        <ul className="-mx-2 mt-1.5">
          {bills.map((b) => {
            const ended = isEnded(b);
            const meta = [
              VEHICLE_BILL_PERIOD_LABELS[b.billing_period],
              spendCategoryLabel(spendCategoryOf(b)),
              ended ? "Ended" : null,
            ]
              .filter(Boolean)
              .join(" • ");
            return (
              <li key={b.id}>
                <Link
                  href={`/dashboard/bills/${b.id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    ended && "opacity-60",
                  )}
                >
                  <Receipt className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{b.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{meta}</span>
                  </span>
                  <Amount value={b.amount} currency={currency} className="shrink-0 text-[12.5px]" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

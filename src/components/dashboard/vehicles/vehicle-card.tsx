import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { PlateChip, VehicleAvatar } from "@/components/dashboard/vehicles/vehicle-identity";
import { cn, formatCurrency } from "@/lib/utils";
import type { VehicleRow } from "@/actions/vehicles";
import {
  monthName,
  vehicleSubtitle,
  type MonthTotal,
  type SpendingSummary,
} from "@/lib/vehicles/spending";

/** Tallest sparkline bar, in px. */
const SPARK_MAX_PX = 32;

/** The months of the trend as small bars in the vehicle's colour, this month solid. */
function Sparkline({ trend, color, currency }: { trend: MonthTotal[]; color: string; currency: string }) {
  const max = trend.reduce((m, t) => Math.max(m, t.total), 0);
  return (
    <div
      className="flex h-9 shrink-0 items-end gap-[3px]"
      title={trend.map((t) => `${monthName(t.month, "short")} ${formatCurrency(t.total, currency)}`).join(" • ")}
      aria-hidden
    >
      {trend.map((t, i) => {
        const has = t.total > 0;
        const height = max > 0 && has ? Math.max(3, Math.round((t.total / max) * SPARK_MAX_PX)) : 2;
        return (
          <span
            key={t.month}
            className="block w-[7px] rounded-b-[1px] rounded-t-[2px]"
            style={{
              height,
              backgroundColor: has ? color : "hsl(var(--border))",
              opacity: has && i < trend.length - 1 ? 0.4 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * One vehicle on the Vehicles page: what it is, what it cost in the month, how
 * that month sits against the ones before it, and what most of it went on. The
 * whole card opens the vehicle's own page.
 */
export function VehicleCard({
  vehicle,
  color,
  summary,
  isCurrentMonth,
  currency,
}: {
  vehicle: VehicleRow;
  color: string;
  summary: SpendingSummary;
  isCurrentMonth: boolean;
  currency: string;
}) {
  const details = [vehicle.type, vehicleSubtitle(vehicle), vehicle.fuel_type].filter(Boolean).join(" • ");
  const count = summary.monthEntries.length;
  const top = summary.categories[0];
  const topPct = top && summary.total > 0 ? Math.round((top.total / summary.total) * 100) : 0;
  const selectedMonth = summary.trend[summary.trend.length - 1]?.month ?? "";

  const footer =
    count === 0
      ? `Nothing recorded in ${monthName(selectedMonth)}`
      : [
          top ? `Mostly ${top.label.toLowerCase()} • ${topPct}%` : null,
          `${count} ${count === 1 ? "entry" : "entries"}`,
        ]
          .filter(Boolean)
          .join(" • ");

  return (
    <Link
      href={`/dashboard/vehicles/${vehicle.id}`}
      className="group surface flex min-w-0 flex-col border border-border bg-card p-4 shadow-[var(--shadow)] transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <VehicleAvatar type={vehicle.type} color={color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-snug">{vehicle.name}</p>
          {details && <p className="truncate text-[12px] text-muted-foreground">{details}</p>}
        </div>
        {vehicle.plate_number && <PlateChip plate={vehicle.plate_number} className="mt-0.5" />}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="fit-figure min-w-0">
          <p className="text-[11.5px] text-muted-foreground">
            {isCurrentMonth ? "So far this month" : `In ${monthName(selectedMonth)}`}
          </p>
          <Amount
            value={summary.total}
            currency={currency}
            className={cn("mt-0.5 text-xl font-semibold tracking-tight", summary.total === 0 && "text-muted-foreground")}
          />
        </div>
        <Sparkline trend={summary.trend} color={color} currency={currency} />
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-[11.5px] text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">{footer}</span>
        {summary.average !== null && (
          <span className="shrink-0 whitespace-nowrap">
            avg <Amount value={Math.round(summary.average)} currency={currency} className="text-[11.5px]" />/mo
          </span>
        )}
        <ChevronRight
          className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden
        />
      </div>
    </Link>
  );
}

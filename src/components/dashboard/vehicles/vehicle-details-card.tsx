import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LedgerRow } from "@/components/passbook/dot-leader";
import { PaintSwatch, PlateChip } from "@/components/dashboard/vehicles/vehicle-identity";
import { cn } from "@/lib/utils";
import type { VehicleRow } from "@/actions/vehicles";
import { monthYearLabel } from "@/lib/vehicles/spending";

/** The vehicle's own details as a ledger, with its notes underneath. */
export function VehicleDetailsCard({
  vehicle,
  onEdit,
  className,
}: {
  vehicle: VehicleRow;
  onEdit: () => void;
  className?: string;
}) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Type", value: vehicle.type },
    { label: "Make", value: vehicle.make },
    { label: "Model", value: vehicle.model },
    { label: "Year", value: vehicle.year },
    { label: "Fuel", value: vehicle.fuel_type },
    {
      label: "Color",
      value: vehicle.color ? (
        <span className="inline-flex items-center gap-1.5">
          <PaintSwatch name={vehicle.color} />
          {vehicle.color}
        </span>
      ) : null,
    },
    { label: "Plate", value: vehicle.plate_number ? <PlateChip plate={vehicle.plate_number} /> : null },
    { label: "Added", value: monthYearLabel(vehicle.created_at.slice(0, 7), "long") },
  ].filter((row) => row.value != null && row.value !== "");

  const notes = vehicle.notes?.trim();

  return (
    <section
      aria-labelledby="vehicle-details-heading"
      className={cn("surface border border-border bg-card px-4 pb-4 pt-3 shadow-[var(--shadow)]", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="vehicle-details-heading" className="text-[13.5px] font-semibold">
          Details
        </h2>
        <Button variant="ghost" size="sm" onClick={onEdit} className="-mr-2 gap-1.5 text-primary hover:text-primary">
          <Pencil className="size-3.5" aria-hidden />
          Edit
        </Button>
      </div>

      <ul className="mt-1.5 space-y-1.5 text-[13px]">
        {rows.map((row) => (
          <li key={row.label}>
            <LedgerRow label={<span className="text-muted-foreground">{row.label}</span>}>
              <span className="min-w-0 truncate text-right font-medium">{row.value}</span>
            </LedgerRow>
          </li>
        ))}
      </ul>

      {notes && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[11.5px] font-medium text-muted-foreground">Notes</p>
          <p className="mt-1 whitespace-pre-line break-words text-[13px] leading-relaxed">{notes}</p>
        </div>
      )}
    </section>
  );
}

import type { LucideIcon } from "lucide-react";
import { Bike, BusFront, Car, CarFront, Ellipsis, Fuel, ShieldCheck, Ticket, Truck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { VEHICLE_PAINT_COLORS, type VehicleSpendCategoryKey } from "@/lib/constants/vehicles";

const VEHICLE_TYPE_ICONS: Record<string, LucideIcon> = {
  Car,
  SUV: CarFront,
  Van: CarFront,
  Pickup: Truck,
  Truck,
  Bus: BusFront,
  Motorcycle: Bike,
  Bicycle: Bike,
  "E-Bike": Bike,
};

/** The icon for a vehicle type, as a component; a car for any type not on the list. */
export function VehicleTypeIcon({ type, className }: { type: string | null | undefined; className?: string }) {
  const Icon = VEHICLE_TYPE_ICONS[type ?? ""] ?? Car;
  return <Icon className={className} aria-hidden />;
}

export const SPEND_CATEGORY_ICONS: Record<VehicleSpendCategoryKey, LucideIcon> = {
  fuel: Fuel,
  maintenance: Wrench,
  insurance: ShieldCheck,
  fees: Ticket,
  other: Ellipsis,
};

const AVATAR_SIZE = {
  sm: { box: "size-8 rounded-lg", icon: "size-4" },
  md: { box: "size-11 rounded-xl", icon: "size-5" },
  lg: { box: "size-12 rounded-xl", icon: "size-6" },
} as const;

/**
 * The vehicle's type as an icon on a tile tinted with the vehicle's own colour, the
 * same colour its chip carries on Expenses and Bills, so a vehicle looks the same
 * wherever it appears. Decorative: the name beside it says which vehicle it is.
 */
export function VehicleAvatar({
  type,
  color,
  size = "md",
  className,
}: {
  type: string | null | undefined;
  color: string;
  size?: keyof typeof AVATAR_SIZE;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center", AVATAR_SIZE[size].box, className)}
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <VehicleTypeIcon type={type} className={AVATAR_SIZE[size].icon} />
    </span>
  );
}

/** A plate number drawn like a plate: mono capitals in a bordered box. */
export function PlateChip({ plate, className }: { plate: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-foreground/25 bg-background px-1.5 py-[3px] font-mono text-[10.5px] font-semibold uppercase leading-none tracking-[0.12em] text-foreground/80 shadow-[inset_0_-1px_0_hsl(var(--foreground)/0.08)]",
        className,
      )}
    >
      <span className="sr-only">Plate number </span>
      {plate}
    </span>
  );
}

/** A dot in the vehicle's paint colour; an empty ring for "Other" or a colour not on the list. */
export function PaintSwatch({ name, className }: { name: string; className?: string }) {
  const swatch = VEHICLE_PAINT_COLORS.find((c) => c.name === name)?.swatch ?? null;
  return (
    <span
      aria-hidden
      className={cn("inline-block size-3 shrink-0 rounded-full border border-foreground/25", className)}
      style={swatch ? { backgroundColor: swatch } : undefined}
    />
  );
}

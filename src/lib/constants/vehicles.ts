import type { VehicleCategoryValue } from "@/lib/constants/vehicle-categories";

/** Vehicle types offered in the vehicle form, in the order the picker shows them. Stored as-is in `vehicles.type`. */
export const VEHICLE_TYPES = [
  "Car",
  "SUV",
  "Pickup",
  "Van",
  "Motorcycle",
  "Truck",
  "Bus",
  "Bicycle",
  "E-Bike",
  "Other",
] as const;

/** Fuel types offered in the vehicle form. Stored as-is in `vehicles.fuel_type`. */
export const VEHICLE_FUEL_TYPES = [
  "Gasoline",
  "Diesel",
  "Electric",
  "Hybrid",
  "LPG",
  "CNG",
  "Other",
] as const;

/**
 * Paint colours offered in the vehicle form, each with the swatch drawn beside it.
 * `swatch: null` is "Other", drawn as an empty ring. Stored by name in `vehicles.color`.
 */
export const VEHICLE_PAINT_COLORS: { name: string; swatch: string | null }[] = [
  { name: "Black", swatch: "#1f2421" },
  { name: "White", swatch: "#f7f8f6" },
  { name: "Silver", swatch: "#c3c9c5" },
  { name: "Gray", swatch: "#6b736e" },
  { name: "Red", swatch: "#c0392b" },
  { name: "Blue", swatch: "#2563eb" },
  { name: "Green", swatch: "#15803d" },
  { name: "Yellow", swatch: "#eab308" },
  { name: "Orange", swatch: "#ea580c" },
  { name: "Brown", swatch: "#7c4a1e" },
  { name: "Gold", swatch: "#c9a227" },
  { name: "Other", swatch: null },
];

/** Oldest model year the vehicle form accepts; the newest is next year + 1. */
export const VEHICLE_MIN_YEAR = 1900;
export const VEHICLE_MAX_YEAR_AHEAD = 2;

/** Months in the spending trend on the Vehicles pages, the selected month included. */
export const VEHICLE_TREND_MONTHS = 6;

/** Months the month picker on the Vehicles pages goes back, the current month included. */
export const VEHICLE_MONTH_OPTION_COUNT = 13;

export type VehicleSpendCategoryKey = VehicleCategoryValue | "other";

/**
 * How vehicle spending is broken down on the Vehicles pages. Bills and expenses share
 * these, keyed by their `vehicle_category`; anything without one counts as Other.
 */
export const VEHICLE_SPEND_CATEGORIES: { key: VehicleSpendCategoryKey; label: string }[] = [
  { key: "fuel", label: "Fuel" },
  { key: "maintenance", label: "Maintenance & repairs" },
  { key: "insurance", label: "Insurance & registration" },
  { key: "fees", label: "Parking, tolls & fees" },
  { key: "other", label: "Other" },
];

export const VEHICLE_BILL_PERIOD_LABELS: Record<"monthly" | "quarterly" | "yearly", string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

/** How many months one payment of each billing period covers, for a bill's monthly cost. */
export const VEHICLE_BILL_PERIOD_MONTHS: Record<"monthly" | "quarterly" | "yearly", number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

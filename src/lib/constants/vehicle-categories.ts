export type VehicleCategoryValue = "fuel" | "fees" | "maintenance" | "insurance";

export const VEHICLE_EXPENSE_CATEGORIES: { value: VehicleCategoryValue; label: string }[] = [
  { value: "fuel", label: "Fuel" },
  { value: "fees", label: "Fees (Parking, Toll, etc.)" },
  { value: "maintenance", label: "Maintenance & Repairs" },
  { value: "insurance", label: "Insurance & Registration" },
];

const VEHICLE_CATEGORY_VALUE_SET = new Set<string>(
  VEHICLE_EXPENSE_CATEGORIES.map((c) => c.value),
);

export function isVehicleExpenseCategoryValue(v: string | null | undefined): v is VehicleCategoryValue {
  return v != null && VEHICLE_CATEGORY_VALUE_SET.has(v);
}

export function labelForVehicleExpenseCategory(value: string | null | undefined): string | null {
  if (!value) return null;
  return VEHICLE_EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? null;
}

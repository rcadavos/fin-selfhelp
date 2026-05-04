export type VehicleCategoryValue = "fuel" | "fees" | "maintenance" | "insurance";

export const VEHICLE_EXPENSE_CATEGORIES: { value: VehicleCategoryValue; label: string }[] = [
  { value: "fuel", label: "Fuel" },
  { value: "fees", label: "Fees (Parking, Toll, etc.)" },
  { value: "maintenance", label: "Maintenance & Repairs" },
  { value: "insurance", label: "Insurance & Registration" },
];

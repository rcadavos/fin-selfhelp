"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shiftPaidMonth } from "@/lib/paid-month";
import { VEHICLE_MONTH_OPTION_COUNT } from "@/lib/constants/vehicles";
import { monthYearLabel } from "@/lib/vehicles/spending";

/**
 * The month picker on both Vehicles pages: `latestMonth` and the months before it.
 * The options come from the month the server rendered with, not the browser's
 * clock, so the picker hydrates with the same text it was rendered with.
 */
export function VehicleMonthSelect({
  value,
  onChange,
  latestMonth,
}: {
  value: string;
  onChange: (month: string) => void;
  latestMonth: string;
}) {
  const options = useMemo(
    () =>
      Array.from({ length: VEHICLE_MONTH_OPTION_COUNT }, (_, i) => shiftPaidMonth(latestMonth, -i)).filter(
        (m): m is string => m !== null,
      ),
    [latestMonth],
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Month"
        className="h-10 w-auto gap-1.5 border-0 bg-transparent px-2 text-sm font-medium shadow-none hover:bg-muted focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 [&>svg]:opacity-60"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((month) => (
          <SelectItem key={month} value={month}>
            {monthYearLabel(month)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

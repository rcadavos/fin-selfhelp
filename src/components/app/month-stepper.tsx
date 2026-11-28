"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MonthStepperOption = { value: string; label: string };

/**
 * A month picker with a step on either side: the arrows move one month at a time
 * and the label between them opens the full list. `options` run newest first, so
 * the left arrow goes back in time and the right one is disabled on the newest.
 */
export function MonthStepper({
  value,
  options,
  onChange,
}: {
  value: string;
  options: MonthStepperOption[];
  onChange: (value: string) => void;
}) {
  const index = options.findIndex((o) => o.value === value);
  const older = index >= 0 ? options[index + 1] : undefined;
  const newer = index > 0 ? options[index - 1] : undefined;

  return (
    <div className="flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="tap-target"
        disabled={!older}
        onClick={() => older && onChange(older.value)}
        aria-label={older ? `Previous month, ${older.label}` : "Previous month"}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          aria-label="Month"
          className="h-11 w-auto gap-1.5 border-0 bg-transparent px-2 text-base font-semibold tracking-tight shadow-none hover:bg-muted focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 [&>svg]:opacity-60"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="tap-target"
        disabled={!newer}
        onClick={() => newer && onChange(newer.value)}
        aria-label={newer ? `Next month, ${newer.label}` : "Next month"}
      >
        <ChevronRight aria-hidden />
      </Button>
    </div>
  );
}

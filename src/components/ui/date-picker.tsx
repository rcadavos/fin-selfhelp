"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatYmdLocal } from "@/lib/expense-due-date";

/** Parse `YYYY-MM-DD` as a local calendar date (no UTC shift). */
export function parseYmdToLocalDate(ymd: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return undefined;
  return dt;
}

export type DatePickerProps = {
  id?: string;
  /** Empty string or `YYYY-MM-DD`. */
  value: string;
  onChange: (ymd: string) => void;
  disabled?: boolean;
  /** Native tooltip on the trigger button. */
  title?: string;
  placeholder?: string;
  /** Render selected value on the trigger; receives local `Date`. */
  formatDisplay?: (ymd: string) => string;
  className?: string;
  /** Extra classes for the trigger `Button`. */
  triggerClassName?: string;
  /** Popover content z-index (e.g. inside dialogs). */
  contentZIndexClass?: string;
  /** Hide dates that bleed in from adjacent months (default true). */
  showOutsideDays?: boolean;
  /** Lock the calendar to a single month — hides prev/next navigation. */
  disableNavigation?: boolean;
};

export function DatePicker({
  id,
  value,
  onChange,
  disabled,
  title,
  placeholder = "Pick a date",
  formatDisplay,
  className,
  triggerClassName,
  contentZIndexClass = "z-[100]",
  showOutsideDays = true,
  disableNavigation = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(() => (value.trim() ? parseYmdToLocalDate(value) : undefined), [value]);

  const label =
    value.trim() && selected
      ? (formatDisplay?.(value) ?? selected.toLocaleDateString(undefined, { dateStyle: "medium" }))
      : placeholder;

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          title={title}
          className={cn(
            "h-9 w-full justify-start text-left font-normal",
            !value.trim() && "text-muted-foreground",
            className,
            triggerClassName
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto border-0 bg-transparent p-0 shadow-none", contentZIndexClass)}
        align="start"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (!d) return;
            onChange(formatYmdLocal(d));
            setOpen(false);
          }}
          defaultMonth={selected ?? new Date()}
          showOutsideDays={showOutsideDays}
          disableNavigation={disableNavigation}
        />
      </PopoverContent>
    </Popover>
  );
}

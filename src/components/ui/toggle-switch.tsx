"use client";

import { cn } from "@/lib/utils";

type ToggleSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-labelledby"?: string;
};

export function ToggleSwitch({
  checked,
  onCheckedChange,
  disabled,
  id,
  "aria-labelledby": ariaLabelledby,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-labelledby={ariaLabelledby}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-primary" : "bg-input",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-md ring-0 transition-[left] duration-200",
          checked ? "left-[calc(100%-1.625rem)]" : "left-0.5"
        )}
      />
    </button>
  );
}

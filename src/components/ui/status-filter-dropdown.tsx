"use client";

import type { ReactNode } from "react";
import { Check, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type StatusFilterOption = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};

export type StatusFilterDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Heading inside the panel (e.g. "Status", "Show statuses"). */
  menuLabel: string;
  activeFilterCount: number;
  options: StatusFilterOption[];
  onReset: () => void;
  onApply: () => void;
  /** Icon shown next to "Filter" on the trigger; defaults to ListFilter. */
  triggerIcon?: ReactNode;
};

export function StatusFilterDropdown({
  open,
  onOpenChange,
  menuLabel,
  activeFilterCount,
  options,
  onReset,
  onApply,
  triggerIcon,
}: StatusFilterDropdownProps) {
  const icon = triggerIcon ?? <ListFilter className="h-4 w-4" aria-hidden />;
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          {icon}
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 ? (
            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
              {activeFilterCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt, index) => (
          <DropdownMenuItem
            key={`${opt.label}-${index}`}
            className="group cursor-pointer hover:bg-transparent focus:bg-transparent focus-visible:bg-transparent data-[highlighted]:bg-transparent"
            onSelect={(e) => {
              e.preventDefault();
              opt.onToggle();
            }}
          >
            <span
              className={cn(
                "inline-flex h-4 w-4 items-center justify-center rounded-sm border border-input transition-shadow group-hover:ring-2 group-hover:ring-ring group-hover:ring-offset-1 group-data-[highlighted]:ring-2 group-data-[highlighted]:ring-ring group-data-[highlighted]:ring-offset-1",
                opt.checked && "border-primary bg-primary text-primary-foreground"
              )}
              aria-hidden
            >
              {opt.checked ? <Check className="h-3 w-3" /> : null}
            </span>
            {opt.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="flex w-full items-center gap-2 p-1">
          <Button type="button" variant="outline" size="sm" className="w-1/2" onClick={onReset}>
            Reset
          </Button>
          <Button type="button" size="sm" className="w-1/2" onClick={onApply}>
            Apply
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

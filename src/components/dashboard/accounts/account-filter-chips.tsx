"use client";

import type { AccountFilter } from "@/lib/constants/accounts";
import { cn } from "@/lib/utils";

export type AccountFilterOption = { id: AccountFilter; label: string; count: number };

/**
 * Chips that narrow the account cards to one type, each with how many accounts it
 * holds. On phones the row scrolls sideways and the chips are 44px tall for thumbs.
 */
export function AccountFilterChips({
  options,
  value,
  onChange,
}: {
  options: AccountFilterOption[];
  value: AccountFilter;
  onChange: (next: AccountFilter) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Show accounts by type"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 py-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {options.map(({ id, label, count }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-9 sm:px-3.5",
              // Ink on paper, flipped: the one fill that stands out from the page in both themes.
              active
                ? "border-foreground bg-foreground text-background"
                : "border-hairline-strong text-foreground hover:bg-muted",
            )}
          >
            {label}
            <span className={cn("font-mono text-[11px]", active ? "text-background/75" : "text-muted-foreground")}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

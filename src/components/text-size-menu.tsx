"use client";

import { useId } from "react";
import { ALargeSmall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTextSize } from "@/hooks/use-text-size";
import { DEFAULT_TEXT_SIZE, TEXT_SIZE_OPTIONS } from "@/lib/constants/text-size";
import { cn } from "@/lib/utils";

/**
 * The Aa button: picks the text size for the whole app on this device. It stays
 * open after a pick, so you can step through the sizes and watch the page change.
 */
export function TextSizeMenu() {
  const [textSize, setTextSize] = useTextSize();
  const headingId = useId();
  const current =
    TEXT_SIZE_OPTIONS.find((o) => o.id === textSize) ??
    TEXT_SIZE_OPTIONS.find((o) => o.id === DEFAULT_TEXT_SIZE)!;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Text size: ${current.label}`}
          title="Text size"
        >
          <ALargeSmall className="h-4 w-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p id={headingId} className="text-sm font-medium">
            Text size
          </p>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {current.label}
          </p>
        </div>
        <div
          role="group"
          aria-labelledby={headingId}
          className="mt-2.5 grid grid-cols-4 gap-1 rounded-lg border bg-muted/40 p-1"
        >
          {TEXT_SIZE_OPTIONS.map((option) => {
            const selected = option.id === textSize;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                aria-label={option.label}
                title={option.label}
                onClick={() => setTextSize(option.id)}
                className={cn(
                  "flex h-10 items-center justify-center rounded-md font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  option.glyphClass,
                  selected
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                A
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">
          Changes the text on every page, on this device.
        </p>
      </PopoverContent>
    </Popover>
  );
}

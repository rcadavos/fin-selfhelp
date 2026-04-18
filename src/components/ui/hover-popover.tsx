"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type HoverPopoverProps = {
  trigger: React.ReactNode;
  content: React.ReactNode;
  /** Optional class for the content panel (default: black bg, white text) */
  contentClassName?: string;
  /** Optional alignment: start, center, end */
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
};

const HIDE_DELAY_MS = 120;

/**
 * Hover popover: shows content on hover. Content panel uses black bg and white text by default.
 * Floats above layout (no shift). Uses a short delay before hiding so the cursor can move to the content.
 */
export function HoverPopover({
  trigger,
  content,
  contentClassName,
  align = "end",
  sideOffset = 4,
  className,
}: HoverPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const hideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const scheduleHide = () => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => setOpen(false), HIDE_DELAY_MS);
  };

  const handleTriggerEnter = () => {
    clearHideTimeout();
    setOpen(true);
  };

  const handleTriggerLeave = () => scheduleHide();

  const handleContentEnter = () => {
    clearHideTimeout();
    setOpen(true);
  };

  const handleContentLeave = () => scheduleHide();

  React.useEffect(() => () => clearHideTimeout(), []);

  const alignClass =
    align === "start"
      ? "left-0"
      : align === "end"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={handleTriggerEnter}
      onMouseLeave={handleTriggerLeave}
    >
      {trigger}
      {open && (
        <div
          className={cn(
            "absolute top-full z-50 w-64 max-w-[calc(100vw-2rem)] rounded-md px-3 py-2.5 text-sm shadow-lg",
            "bg-black text-white",
            alignClass,
            contentClassName
          )}
          style={{ marginTop: sideOffset }}
          onMouseEnter={handleContentEnter}
          onMouseLeave={handleContentLeave}
        >
          {content}
        </div>
      )}
    </div>
  );
}

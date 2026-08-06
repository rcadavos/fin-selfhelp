"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { cn } from "@/lib/utils";

/**
 * Copies text to the clipboard, confirms with a snackbar, and briefly swaps its
 * icon for a tick. Falls back to a hidden textarea + `execCommand` on browsers
 * that withhold the async clipboard API outside a secure context.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = legacyCopy(text);
      }
      if (ok) {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
      }
      return ok;
    },
    [resetMs]
  );

  return { copied, copy };
}

function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  successMessage = "Copied to clipboard",
  variant = "outline",
  size = "sm",
  className,
  iconOnly = false,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  successMessage?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "xs" | "sm" | "default" | "icon-sm" | "icon";
  className?: string;
  iconOnly?: boolean;
}) {
  const { copied, copy } = useCopyToClipboard();
  const { showSuccess, showError } = useSnackbar();

  async function handleClick() {
    const ok = await copy(value);
    if (ok) showSuccess(successMessage);
    else showError("Could not copy — please copy it manually.");
  }

  const Icon = copied ? Check : Copy;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn("shrink-0 gap-1.5", className)}
      aria-label={iconOnly ? label : undefined}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {iconOnly ? null : copied ? copiedLabel : label}
    </Button>
  );
}

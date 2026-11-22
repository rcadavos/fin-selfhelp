"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { BillsModeConfirmDialog } from "@/components/app/bills-mode-confirm-dialog";
import { useAppMode } from "@/hooks/use-app-mode";
import { BILLS_MODE_TOGGLE_COPY } from "@/lib/constants/app-mode";
import { cn } from "@/lib/utils";

const SWITCH_ID = "toolbar-bills-mode";

/**
 * Quick switch between bills mode and full cashflow, for the desktop toolbar. The same
 * choice lives in Settings • Preferences; this is the shortcut. Turning bills mode on
 * asks first, because it hides pages and pauses auto-debit.
 */
export function BillsModeToggle({ className }: { className?: string }) {
  const { isBillsMode, isResolved, setMode } = useAppMode();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Until the stored preference loads the mode reads as the default, so the switch
  // would flash "off" for a bills-mode user. Hold its space instead.
  if (!isResolved) {
    return <span className={cn("inline-block h-8 w-40 rounded-full bg-muted/60", className)} aria-hidden />;
  }

  function handleChange(next: boolean) {
    if (next) {
      setConfirmOpen(true);
      return;
    }
    setMode("full");
  }

  return (
    <>
      <div
        className={cn(
          "flex h-8 items-center gap-2 rounded-full border px-3 transition-colors",
          isBillsMode ? "border-primary/40 bg-primary/10" : "border-border hover:bg-muted/60",
          className
        )}
        title={isBillsMode ? BILLS_MODE_TOGGLE_COPY.turnOffHint : BILLS_MODE_TOGGLE_COPY.turnOnHint}
      >
        <label
          htmlFor={SWITCH_ID}
          className={cn(
            "flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap text-sm font-medium",
            isBillsMode ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Bell className="h-4 w-4 shrink-0" aria-hidden />
          {BILLS_MODE_TOGGLE_COPY.label}
        </label>
        <ToggleSwitch id={SWITCH_ID} checked={isBillsMode} onCheckedChange={handleChange} />
      </div>

      <BillsModeConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => setMode("bills")}
      />
    </>
  );
}

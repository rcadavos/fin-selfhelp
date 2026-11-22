"use client";

import { useId, useState } from "react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { BillsModeConfirmDialog } from "@/components/app/bills-mode-confirm-dialog";
import { useAppMode } from "@/hooks/use-app-mode";
import { BILLS_MODE_TOGGLE_COPY } from "@/lib/constants/app-mode";
import { cn } from "@/lib/utils";

/**
 * Quick switch between bills mode and full cashflow, for the desktop toolbar and the
 * phone More sheet. The same choice lives in Settings • Preferences; this is the
 * shortcut. Turning bills mode on asks first, because it hides pages and pauses auto-debit.
 */
export function BillsModeToggle({ className }: { className?: string }) {
  const { isBillsMode, isResolved, setMode } = useAppMode();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Unique per instance: the toolbar copy stays mounted (just hidden) on phones, so a
  // shared id would point this label at the hidden switch.
  const switchId = useId();

  // Until the stored preference loads the mode reads as the default, so the switch
  // would flash "off" for a bills-mode user. Hold its space instead.
  if (!isResolved) {
    return <span className={cn("inline-block h-5 w-32", className)} aria-hidden />;
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
        className={cn("flex items-center gap-2", className)}
        title={isBillsMode ? BILLS_MODE_TOGGLE_COPY.turnOffHint : BILLS_MODE_TOGGLE_COPY.turnOnHint}
      >
        <label
          htmlFor={switchId}
          className="cursor-pointer select-none whitespace-nowrap text-sm font-medium text-muted-foreground"
        >
          {BILLS_MODE_TOGGLE_COPY.label}
        </label>
        <ToggleSwitch id={switchId} checked={isBillsMode} onCheckedChange={handleChange} />
      </div>

      <BillsModeConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => setMode("bills")}
      />
    </>
  );
}

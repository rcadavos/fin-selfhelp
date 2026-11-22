"use client";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { BILLS_MODE_CONFIRM_COPY } from "@/lib/constants/app-mode";

/** Asks before switching to bills mode, which hides pages and pauses auto-debit. */
export function BillsModeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={BILLS_MODE_CONFIRM_COPY.title}
      description={BILLS_MODE_CONFIRM_COPY.description}
      confirmLabel={BILLS_MODE_CONFIRM_COPY.confirmLabel}
      cancelLabel={BILLS_MODE_CONFIRM_COPY.cancelLabel}
      onConfirm={onConfirm}
    />
  );
}

import { cn } from "@/lib/utils";
import { PROSPECT_CHAT_PANEL_ID } from "@/lib/constants/prospect-chat";

/**
 * The positioned frame of the prospect chat — a floating card above the
 * launcher from `sm` up, a bottom sheet with a backdrop on phones. Kept apart
 * from the panel so the loading placeholder can use the same frame without
 * pulling in the chat runtime.
 */
export function ProspectChatShell({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Phones only: the panel is a sheet there, so tapping outside it closes it. */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[55] bg-black/40 animate-in fade-in-0 duration-200 sm:hidden motion-reduce:animate-none",
          !open && "hidden",
        )}
      />
      <section
        id={PROSPECT_CHAT_PANEL_ID}
        role="dialog"
        aria-modal={false}
        aria-labelledby={labelledBy}
        className={cn(
          "fixed z-[60] flex flex-col overflow-hidden border border-border bg-background shadow-2xl",
          "inset-x-0 bottom-0 h-[88dvh] rounded-t-[1.75rem]",
          "sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[min(36rem,calc(100dvh-8rem))] sm:w-[23rem] sm:rounded-2xl",
          // Clear the launcher when it has lifted above the cookie notice.
          "sm:[body:has(#cookie-consent-banner)_&]:bottom-40 sm:[body:has(#cookie-consent-banner)_&]:h-[min(36rem,calc(100dvh-12rem))]",
          "origin-bottom-right animate-in fade-in-0 slide-in-from-bottom-4 duration-200 sm:zoom-in-95 motion-reduce:animate-none",
          !open && "hidden",
        )}
      >
        {children}
      </section>
    </>
  );
}

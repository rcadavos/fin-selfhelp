"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FormPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  /**
   * Extra classes applied only to the mobile (bottom) sheet. Pass `h-[90dvh]`
   * to make a short form fill the screen from the top — content stays high and
   * any in-form dropdowns have room to open — instead of hugging the bottom.
   */
  mobileClassName?: string;
  /**
   * Forwarded to Radix's SheetContent. Fires on every content mount — including
   * the remount caused by the responsive bottom↔right switch — so callers can
   * reliably claim focus without racing the open animation.
   */
  onOpenAutoFocus?: (event: Event) => void;
}

export function FormPanel({ open, onOpenChange, children, className, mobileClassName, onOpenAutoFocus }: FormPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          onOpenAutoFocus={onOpenAutoFocus}
          className={cn("flex flex-col p-0 w-[440px] sm:max-w-[440px] overflow-hidden", className)}
        >
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(
          "flex flex-col p-0 rounded-t-2xl max-h-[90dvh] overflow-hidden",
          className,
          mobileClassName
        )}
      >
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        {children}
      </SheetContent>
    </Sheet>
  );
}

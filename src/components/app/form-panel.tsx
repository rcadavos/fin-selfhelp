"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FormPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function FormPanel({ open, onOpenChange, children, className }: FormPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
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
        className={cn(
          "flex flex-col p-0 rounded-t-2xl max-h-[90dvh] overflow-hidden",
          className
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

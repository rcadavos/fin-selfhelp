"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SpendingByCategoryCollapsibleCard({
  expanded,
  onToggle,
  dashed,
  panelId = "spending-by-category-chart-body",
  children,
}: {
  expanded: boolean;
  onToggle: () => void;
  dashed?: boolean;
  /** Stable id for `aria-controls` / region (use a unique value per page). */
  panelId?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("h-full", dashed && "border-dashed bg-muted/20")}>
      <CardHeader className="space-y-0 border-0 p-0 pb-0 sm:p-6 sm:pb-0 sm:pt-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-t-lg px-6 py-4 text-left transition-colors hover:bg-muted/40 active:bg-muted/50 sm:hidden"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
        >
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Spending by category
          </CardTitle>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
        </button>
        <div className="hidden sm:block">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Spending by category
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent
        id={panelId}
        className={cn("pt-1 pb-3", expanded ? "block" : "max-sm:hidden sm:block")}
      >
        {children}
      </CardContent>
    </Card>
  );
}

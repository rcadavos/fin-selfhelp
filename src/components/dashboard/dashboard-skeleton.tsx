import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type DashboardSkeletonVariant =
  | "page"
  | "form"
  | "dashboard";

type DashboardSkeletonProps = {
  variant?: DashboardSkeletonVariant;
  className?: string;
};

// Internal hairline rules for the responsive 4/2-up stat grid — mirrors the live layout.
const CELL_BORDERS = [
  "",
  "border-l border-border",
  "border-t border-border sm:border-t-0 sm:border-l",
  "border-l border-t border-border sm:border-t-0",
];

export function DashboardSkeleton({ variant = "page", className }: DashboardSkeletonProps) {
  // Structural skeleton that resembles the dashboard so there is no layout
  // shift when the real content lands.
  if (variant === "dashboard") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading"
        className={cn("mx-auto max-w-6xl px-4 py-6 sm:py-8", className)}
      >
        {/* Statement header */}
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-3 w-28" />
        <Skeleton className="mt-2 h-9 w-56" />
        <Skeleton className="mt-3 h-3 w-44" />

        {/* Stat cells */}
        <div className="mt-6 grid grid-cols-2 overflow-hidden surface border border-border sm:grid-cols-4">
          {CELL_BORDERS.map((border, i) => (
            <div key={i} className={cn("p-4 sm:p-5", border)}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-5 w-24" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          ))}
        </div>

        {/* Chart + bills */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="surface border border-border lg:col-span-2">
            <div className="border-b border-border p-4 sm:p-5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="mt-2 h-3 w-56" />
            </div>
            <div className="p-4">
              <Skeleton className="h-[220px] w-full" />
            </div>
          </div>
          <div className="surface border border-border">
            <div className="border-b border-border p-4 sm:p-5">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn(
        "flex items-center justify-center",
        variant === "form" ? "min-h-[30vh]" : "min-h-[60vh]",
        className
      )}
    >
      <Image
        src="/favicon.png"
        alt=""
        aria-hidden
        className="animate-breathing"
        width={100}
        height={100}
      />
    </div>
  );
}

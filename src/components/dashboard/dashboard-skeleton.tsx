import { cn } from "@/lib/utils";
import { OttoLoader } from "@/components/mascot/otto";
import { Skeleton } from "@/components/ui/skeleton";

export type DashboardSkeletonVariant =
  | "page"
  | "form"
  | "dashboard";

type DashboardSkeletonProps = {
  variant?: DashboardSkeletonVariant;
  className?: string;
};

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
        {/* Greeting + hide amounts */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-1.5 h-8 w-64 max-w-full" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl lg:h-10" />
        </div>

        {/* Your money at a glance */}
        <div className="surface mt-5 grid overflow-hidden border border-border sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={cn("p-4 sm:p-5", i === 1 && "border-t border-border sm:border-l sm:border-t-0")}
            >
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="mt-2 h-9 w-52 max-w-full" />
              <Skeleton className="mt-3 h-4 w-40" />
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <Skeleton className="mt-6 h-5 w-56 max-w-full" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>

        {/* Bills to pay + spending */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3 lg:items-start">
          <div className="surface border border-border lg:col-span-2">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-5 px-4 py-4 sm:px-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2.5">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-8 w-40" />
                </div>
              ))}
            </div>
          </div>
          <div className="surface space-y-3 border border-border p-4 sm:p-5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
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
      <OttoLoader size={100} />
    </div>
  );
}

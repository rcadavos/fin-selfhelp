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
            <Skeleton className="h-5 w-56" />
            <Skeleton className="mt-2 h-9 w-72 max-w-full" />
          </div>
          <Skeleton className="h-12 w-44 rounded-lg" />
        </div>

        {/* Your money at a glance */}
        <div className="surface mt-6 grid overflow-hidden border border-border sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={cn("p-5 sm:p-7", i === 1 && "border-t border-border sm:border-l sm:border-t-0")}
            >
              <Skeleton className="h-6 w-56 max-w-full" />
              <Skeleton className="mt-3 h-11 w-60 max-w-full" />
              <Skeleton className="mt-4 h-5 w-44" />
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <Skeleton className="mt-8 h-7 w-72 max-w-full" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>

        {/* Bills to pay + spending */}
        <div className="mt-8 grid gap-5 lg:grid-cols-3 lg:items-start">
          <div className="surface border border-border lg:col-span-2">
            <div className="border-b border-border px-4 py-4 sm:px-6 sm:py-5">
              <Skeleton className="h-7 w-40" />
            </div>
            <div className="space-y-6 px-4 py-5 sm:px-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-9 w-56" />
                </div>
              ))}
            </div>
          </div>
          <div className="surface space-y-4 border border-border p-5 sm:p-6">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
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

import Image from "next/image";
import { cn } from "@/lib/utils";

export type DashboardSkeletonVariant =
  | "dashboard"
  | "expenses"
  | "my-goals"
  | "calculators-index"
  | "calculator-detail"
  | "to-buy-list";

type DashboardSkeletonProps = {
  variant: DashboardSkeletonVariant;
  className?: string;
};

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn("flex min-h-[60vh] items-center justify-center", className)}
    >
      <span className="sr-only">Loading…</span>
      <Image src="/favicon.png" alt="" aria-hidden className="h-40 w-40 animate-breathing" width={80} height={80} />
    </div>
  );
}

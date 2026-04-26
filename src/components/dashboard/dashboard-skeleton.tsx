import Image from "next/image";
import { cn } from "@/lib/utils";

export type DashboardSkeletonVariant =
  | "page"
  | "form";

type DashboardSkeletonProps = {
  variant?: DashboardSkeletonVariant;
  className?: string;
};

export function DashboardSkeleton({ variant = "page", className }: DashboardSkeletonProps) {
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
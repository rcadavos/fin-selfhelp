"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BudgetToolSectionProps {
  children: React.ReactNode;
  isActive: boolean;
  isLoggedIn?: boolean;
  className?: string;
}

export function BudgetToolSection({
  children,
  isActive,
  isLoggedIn,
  className,
}: BudgetToolSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isActive]);

  return (
    <section
      id="budget-tool"
      ref={ref}
      className={cn(
        "scroll-mt-20 border-t bg-muted/20 px-4 py-16 sm:px-6 lg:px-8",
        className
      )}
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Your budget
          </h2>
          <p className="mt-2 text-muted-foreground">
            Enter your numbers below to see where you stand.
            {isLoggedIn && " Your data is saved when you click Save."}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

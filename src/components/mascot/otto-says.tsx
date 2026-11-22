import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Otto } from "./otto";

/** A line Otto says, in a speech bubble; with `face`, his head beside it. */
export function OttoSays({
  children,
  face = false,
  className,
}: {
  children: ReactNode;
  face?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {face && <Otto pose="face" size={52} />}
      <p className="surface max-w-[260px] border border-hairline-strong bg-card px-3.5 py-2.5 text-sm leading-snug text-foreground shadow-sm">
        {children}
      </p>
    </div>
  );
}

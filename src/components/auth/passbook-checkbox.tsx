import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Token-styled checkbox for the auth forms (there is no shared shadcn Checkbox
 * in this codebase). Renders a real <input type="checkbox"> — all native form
 * semantics and controlled `checked`/`onChange` are preserved — with an
 * appearance-none box painted from design tokens and a check glyph on top.
 */
export type PassbookCheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapClassName?: string;
};

export const PassbookCheckbox = React.forwardRef<HTMLInputElement, PassbookCheckboxProps>(
  ({ className, wrapClassName, ...props }, ref) => (
    <span className={cn("relative inline-flex h-4 w-4 shrink-0", wrapClassName)}>
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "peer h-4 w-4 cursor-pointer appearance-none rounded-[4px] border border-hairline-strong bg-card transition-colors",
          "checked:border-primary checked:bg-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      <Check
        className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
        strokeWidth={3}
        aria-hidden
      />
    </span>
  )
);
PassbookCheckbox.displayName = "PassbookCheckbox";

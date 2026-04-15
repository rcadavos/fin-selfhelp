"use client";

import * as React from "react";
import { cn, formatAmountWithCommas, parseAmountInput } from "@/lib/utils";

function getCursorPositionAfterFormat(
  formatted: string,
  oldValue: string,
  oldCursor: number
): number {
  const digitsBeforeCursor = (oldValue.slice(0, oldCursor).match(/\d/g) || []).length;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) count++;
    if (count === digitsBeforeCursor) return i + 1;
  }
  return formatted.length;
}

export type AmountInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onChange: (rawDigits: string) => void;
};

const AmountInput = React.forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const oldValueRef = React.useRef("");
    const oldCursorRef = React.useRef(0);
    const isInternalChange = React.useRef(false);

    const mergedRef = (el: HTMLInputElement | null) => {
      inputRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    const formatted = formatAmountWithCommas(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      oldValueRef.current = input.value;
      oldCursorRef.current = input.selectionStart ?? 0;
      const raw = parseAmountInput(input.value);
      isInternalChange.current = true;
      onChange(raw);
    };

    React.useEffect(() => {
      if (!isInternalChange.current || !inputRef.current) return;
      isInternalChange.current = false;
      const newCursor = getCursorPositionAfterFormat(
        formatted,
        oldValueRef.current,
        oldCursorRef.current
      );
      inputRef.current.setSelectionRange(newCursor, newCursor);
    }, [formatted]);

    return (
      <input
        type="text"
        inputMode="numeric"
        value={formatted}
        onChange={handleChange}
        ref={mergedRef}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm md:file:text-sm",
          className
        )}
        {...props}
      />
    );
  }
);
AmountInput.displayName = "AmountInput";

export { AmountInput };

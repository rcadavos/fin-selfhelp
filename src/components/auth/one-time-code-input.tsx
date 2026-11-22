"use client";

import { Input, type InputProps } from "@/components/ui/input";
import { TWO_FACTOR_CODE_LENGTH } from "@/lib/constants/two-factor";
import { normalizeTwoFactorCode } from "@/lib/shared/two-factor";
import { cn } from "@/lib/utils";

type OneTimeCodeInputProps = Omit<InputProps, "value" | "onChange" | "type" | "maxLength"> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * Single field for an emailed numeric code. Keeps digits only, so a pasted
 * "123 456" or "123-456" still fills it, and offers the code from the keyboard's
 * suggestion bar on phones (`autoComplete="one-time-code"`).
 */
export function OneTimeCodeInput({ value, onValueChange, className, ...props }: OneTimeCodeInputProps) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern={`\\d{${TWO_FACTOR_CODE_LENGTH}}`}
      placeholder={"0".repeat(TWO_FACTOR_CODE_LENGTH)}
      spellCheck={false}
      value={value}
      onChange={(e) => onValueChange(normalizeTwoFactorCode(e.target.value))}
      className={cn(
        "h-12 pl-[calc(0.75rem+0.4em)] text-center font-mono text-xl tracking-[0.4em] tabular-nums placeholder:text-muted-foreground/40 md:text-xl",
        className
      )}
      {...props}
    />
  );
}

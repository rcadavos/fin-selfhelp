import type { ComponentProps } from "react";

import { normalizeTwoFactorCode, TWO_FACTOR_CODE_LENGTH } from "@shared/two-factor";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

type OneTimeCodeInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChangeText" | "keyboardType" | "maxLength"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * Field for an emailed numeric code. Keeps digits only, so a pasted "123 456" still
 * fills it, and lets iOS offer the code from Mail above the keyboard.
 */
export function OneTimeCodeInput({ value, onValueChange, className, style, ...props }: OneTimeCodeInputProps) {
  return (
    <Input
      value={value}
      onChangeText={(text) => onValueChange(normalizeTwoFactorCode(text))}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      autoCorrect={false}
      placeholder={"0".repeat(TWO_FACTOR_CODE_LENGTH)}
      className={cn("text-center text-2xl font-semibold", className)}
      style={[{ letterSpacing: 8, fontVariant: ["tabular-nums"] }, style]}
      {...props}
    />
  );
}

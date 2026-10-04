import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

import { useThemeColors } from "@/hooks/use-theme";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "outline" | "ghost" | "destructive";

const containerClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary",
  outline: "border border-hairline-strong bg-card",
  ghost: "bg-transparent",
  destructive: "bg-destructive",
};

const labelClasses: Record<ButtonVariant, string> = {
  primary: "text-primary-foreground",
  outline: "text-foreground",
  ghost: "text-primary",
  destructive: "text-destructive-foreground",
};

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Shown before the label, e.g. a provider mark. */
  icon?: ReactNode;
  className?: string;
};

export function Button({ label, variant = "primary", loading = false, icon, disabled, className, ...props }: ButtonProps) {
  const colors = useThemeColors();
  const spinnerColor =
    variant === "primary"
      ? colors["primary-foreground"]
      : variant === "destructive"
        ? colors["destructive-foreground"]
        : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      className={cn(
        "min-h-12 flex-row items-center justify-center gap-2 rounded-lg px-4 active:opacity-80",
        containerClasses[variant],
        (disabled || loading) && "opacity-60",
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <>
          {icon}
          <Text className={cn("text-base font-semibold", labelClasses[variant])}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

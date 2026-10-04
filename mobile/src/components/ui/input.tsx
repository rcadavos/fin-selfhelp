import type { Ref } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { useThemeColors } from "@/hooks/use-theme";
import { cn } from "@/lib/utils/cn";

type InputProps = TextInputProps & {
  label: string;
  ref?: Ref<TextInput>;
};

export function Input({ label, className, ...props }: InputProps) {
  const colors = useThemeColors();

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors["muted-foreground"]}
        className={cn(
          "min-h-12 rounded-lg border border-input bg-card px-3 text-base text-foreground focus:border-ring",
          className,
        )}
        {...props}
      />
    </View>
  );
}

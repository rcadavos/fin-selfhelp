import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import type { ErrorBoundaryProps } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";

/**
 * Re-export from a route as `ErrorBoundary` to catch its `useSuspenseQuery` failures.
 * Resetting the query boundary first is what lets the failed queries fetch again on retry.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Text className="text-lg font-semibold text-foreground">Something went wrong</Text>
      <Text className="text-center text-sm text-muted-foreground">{error.message}</Text>
      <Button
        label="Try again"
        variant="outline"
        onPress={() => {
          reset();
          void retry();
        }}
      />
    </View>
  );
}

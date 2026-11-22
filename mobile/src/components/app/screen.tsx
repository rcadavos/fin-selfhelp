import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "@/hooks/use-theme";

type ScreenProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Enables pull-to-refresh; the spinner stays until the promise settles. */
  onRefresh?: () => Promise<unknown>;
  /** Shows a Back button above the title, for screens pushed on top of the tabs. */
  back?: boolean;
};

/** Page shell for tab screens: safe-area top, title block, centered column on tablets. */
export function Screen({ title, subtitle, children, onRefresh, back = false }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      <View className="w-full max-w-2xl gap-6 self-center px-4 sm:px-6">
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            className="-mb-3 -ml-1 flex-row items-center self-start active:opacity-70"
          >
            <ChevronLeft color={colors.primary} size={22} />
            <Text className="text-base font-medium text-primary">Back</Text>
          </Pressable>
        ) : null}
        <View className="gap-1">
          <Text className="text-3xl font-bold tracking-tight text-foreground">{title}</Text>
          {subtitle ? <Text className="text-sm text-muted-foreground">{subtitle}</Text> : null}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

/** A titled block inside a `Screen`, with an optional trailing action. */
export function ScreenSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

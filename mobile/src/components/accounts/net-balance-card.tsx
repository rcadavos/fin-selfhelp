import { Text, View } from "react-native";

import { formatCurrency } from "@shared/number-format";

import { Skeleton } from "@/components/ui/skeleton";

export function NetBalanceCard({ amount, includedCount }: { amount: number; includedCount: number }) {
  return (
    <View className="gap-2 rounded-lg bg-panel p-5">
      <Text className="text-xs font-semibold uppercase tracking-wider text-panel-muted">Net Balance</Text>
      <Text
        className="text-4xl font-bold tracking-tight text-panel-foreground"
        style={{ fontVariant: ["tabular-nums"] }}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {formatCurrency(amount)}
      </Text>
      <Text className="text-xs text-panel-muted">
        {includedCount === 1 ? "Across 1 account" : `Across ${includedCount} accounts`}
      </Text>
    </View>
  );
}

export function NetBalanceCardSkeleton() {
  return (
    <View className="gap-3 rounded-lg bg-panel p-5">
      <Skeleton className="h-3 w-24 bg-panel-muted/30" />
      <Skeleton className="h-9 w-48 bg-panel-muted/30" />
      <Skeleton className="h-3 w-28 bg-panel-muted/30" />
    </View>
  );
}

import { Text, View } from "react-native";

import { ACCOUNT_TYPE_OPTIONS, type AccountRow } from "@shared/accounts";
import { formatCurrency } from "@shared/number-format";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

const TABULAR = { fontVariant: ["tabular-nums" as const] };

function accountTypeLabel(type: AccountRow["account_type"]): string {
  return ACCOUNT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function AccountListItem({ account, balance, last }: { account: AccountRow; balance: number; last: boolean }) {
  const meta = [
    account.bank_name,
    accountTypeLabel(account.account_type),
    !account.include_in_net_balance && "Not in net balance",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <View
      className={cn("flex-row items-center gap-3 px-4 py-3.5", !last && "border-b border-border")}
      accessible
      accessibilityLabel={`${account.account_alias}, ${meta}, ${formatCurrency(balance, account.currency)}`}
    >
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: account.color }} />
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          {account.account_alias}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text
        className={cn("text-base font-semibold", balance < 0 ? "text-destructive" : "text-foreground")}
        style={TABULAR}
      >
        {formatCurrency(balance, account.currency)}
      </Text>
    </View>
  );
}

export function AccountList({ accounts, balances }: { accounts: AccountRow[]; balances: Record<string, number> }) {
  return (
    <Card>
      {accounts.map((account, i) => (
        <AccountListItem
          key={account.id}
          account={account}
          balance={balances[account.id] ?? account.starting_balance}
          last={i === accounts.length - 1}
        />
      ))}
    </Card>
  );
}

export function AccountListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} className={cn("flex-row items-center gap-3 px-4 py-4", i < rows - 1 && "border-b border-border")}>
          <View className="h-2.5 w-2.5 rounded-full bg-muted" />
          <View className="flex-1 gap-2">
            <View className="h-4 w-32 rounded-md bg-muted" />
            <View className="h-3 w-24 rounded-md bg-muted" />
          </View>
          <View className="h-4 w-20 rounded-md bg-muted" />
        </View>
      ))}
    </Card>
  );
}

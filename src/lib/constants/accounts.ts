import type { AccountType } from "@/lib/shared/accounts";

/** Days of Net Balance history the Accounts page loads and charts, today included. */
export const NET_BALANCE_HISTORY_DAYS = 7;

/** `bank_name` of the built-in Cash account, which is always counted and cannot be deleted. */
export const CASH_BANK_NAME = "Cash";

/** The filter chip that shows every account. */
export const ACCOUNT_FILTER_ALL = "all";

export type AccountFilter = AccountType | typeof ACCOUNT_FILTER_ALL;

/**
 * Account types as the Accounts page names them, in the order its filter chips run.
 * Cash and e-wallets are saved as "debit", hence that label.
 */
export const ACCOUNT_GROUPS: readonly { type: AccountType; label: string }[] = [
  { type: "debit", label: "Cash & debit" },
  { type: "savings", label: "Savings" },
  { type: "credit", label: "Credit" },
  { type: "stocks", label: "Stocks" },
  { type: "crypto", label: "Crypto" },
  { type: "collectibles", label: "Collectibles" },
  { type: "asset", label: "Assets" },
] as const;

export const ACCOUNT_GROUP_LABELS = Object.fromEntries(
  ACCOUNT_GROUPS.map(({ type, label }) => [type, label]),
) as Record<AccountType, string>;

/**
 * Fills for the "Where your money sits" bar and its legend, largest share first.
 * One green at falling strength, so the slices differ in lightness in both themes.
 * A type past the last entry reuses it.
 */
export const ACCOUNT_MIX_SHADES = [
  "bg-primary",
  "bg-primary/65",
  "bg-primary/40",
  "bg-primary/25",
  "bg-primary/15",
] as const;

/** Tags an account card shows before the rest are dropped. */
export const ACCOUNT_CARD_TAG_LIMIT = 2;

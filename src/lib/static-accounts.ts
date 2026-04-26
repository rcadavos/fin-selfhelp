import type { AccountRow } from "@/actions/accounts";

export const STATIC_ACCOUNT_IDS = {
  CASH: "00000000-0000-0000-0000-000000000001",
  BORROWED: "00000000-0000-0000-0000-000000000002",
} as const;

export const STATIC_ACCOUNTS: AccountRow[] = [
  { id: STATIC_ACCOUNT_IDS.CASH, account_alias: "Cash", bank_name: "Cash", tags: ["Cash"], color: "#22c55e" },
  { id: STATIC_ACCOUNT_IDS.BORROWED, account_alias: "Borrowed", bank_name: "Borrowed", tags: ["Borrowed"], color: "#818181" },
];

/**
 * Account row shape and pure helpers shared by `src/actions/accounts.ts` and the
 * mobile app. Dependency-free with relative imports only (see `number-format.ts`).
 */

export type AccountType = "debit" | "credit" | "savings" | "stocks" | "crypto" | "collectibles" | "asset";
export type InterestFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "annually";

export const ACCOUNT_TYPES: readonly AccountType[] = [
  "debit",
  "credit",
  "savings",
  "stocks",
  "crypto",
  "collectibles",
  "asset",
];

export const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: "debit", label: "Debit" },
  { value: "credit", label: "Credit" },
  { value: "savings", label: "Savings" },
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
  { value: "collectibles", label: "Collectibles" },
  { value: "asset", label: "Asset" },
];

export const INTEREST_FREQUENCIES: readonly InterestFrequency[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "annually",
];

export type AccountRow = {
  id: string;
  account_alias: string;
  bank_name: string;
  tags: string[];
  color: string;
  account_type: AccountType;
  starting_balance: number;
  interest_frequency: InterestFrequency | null;
  interest_rate: number | null;
  maintaining_balance: number | null;
  credit_limit: number | null;
  include_in_net_balance: boolean;
  currency: string;
};

export const ACCOUNT_SELECT =
  "id, account_alias, bank_name, tags, color, account_type, starting_balance, interest_frequency, interest_rate, maintaining_balance, credit_limit, include_in_net_balance, currency";

export function mapAccountRow(r: Record<string, unknown>): AccountRow {
  const type = String(r.account_type ?? "debit") as AccountType;
  const freqRaw = r.interest_frequency == null ? null : String(r.interest_frequency);
  return {
    id: String(r.id),
    account_alias: String(r.account_alias ?? ""),
    bank_name: String(r.bank_name ?? ""),
    tags: Array.isArray(r.tags) ? (r.tags as unknown[]).map(String) : [],
    color: String(r.color ?? "#6366f1"),
    account_type: ACCOUNT_TYPES.includes(type) ? type : "debit",
    starting_balance: Number(r.starting_balance ?? 0),
    interest_frequency:
      freqRaw && INTEREST_FREQUENCIES.includes(freqRaw as InterestFrequency)
        ? (freqRaw as InterestFrequency)
        : null,
    interest_rate: r.interest_rate != null ? Number(r.interest_rate) : null,
    maintaining_balance: r.maintaining_balance != null ? Number(r.maintaining_balance) : null,
    credit_limit: r.credit_limit != null ? Number(r.credit_limit) : null,
    include_in_net_balance: r.include_in_net_balance !== false,
    currency: String(r.currency ?? "PHP"),
  };
}

/**
 * Per-account live balance = starting_balance + SUM(account_transactions.amount).
 * Intentionally ignores expense_entries / bills that merely tag an account.
 */
export function sumAccountBalances(
  accountRows: { id: unknown; starting_balance: unknown }[],
  txRows: { account_id: unknown; amount: unknown }[]
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const a of accountRows) {
    balances[String(a.id)] = Number(a.starting_balance ?? 0);
  }
  for (const r of txRows) {
    const id = r.account_id as string | null;
    if (!id) continue;
    balances[id] = (balances[id] ?? 0) + Number(r.amount);
  }
  return balances;
}

/** The "Cash" account leads the list; the rest keep their order (created_at). */
export function sortAccountsCashFirst<T extends Pick<AccountRow, "account_alias">>(accounts: T[]): T[] {
  return [...accounts].sort((a, b) => {
    const aIsCash = a.account_alias.toLowerCase() === "cash";
    const bIsCash = b.account_alias.toLowerCase() === "cash";
    if (aIsCash) return -1;
    if (bIsCash) return 1;
    return 0;
  });
}

/** Net Balance = live balances of the accounts flagged `include_in_net_balance`. */
export function computeNetBalance(
  accounts: Pick<AccountRow, "id" | "include_in_net_balance">[],
  balances: Record<string, number>
): number {
  return accounts
    .filter((a) => a.include_in_net_balance)
    .reduce((s, acc) => s + (balances[acc.id] ?? 0), 0);
}

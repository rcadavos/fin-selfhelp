/**
 * Account row shape and pure helpers shared by `src/actions/accounts.ts` and the
 * mobile app. Dependency-free with relative imports only (see `number-format.ts`).
 */

import { roundToCents } from "./number-format";

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

/** Every counted account of one type, summed. */
export type AccountMixGroup = {
  type: AccountType;
  count: number;
  total: number;
  /** This type's part (0 to 1) of the money held; null when the type holds nothing or is in the negative. */
  share: number | null;
};

export type AccountMix = {
  /** Counted accounts by type, largest total first. The totals add up to the Net Balance. */
  groups: AccountMixGroup[];
  /** Credit accounts outside the Net Balance that carry a debt. `total` is what is owed, as a positive number. */
  owedOnCredit: { count: number; total: number };
  /** Every other account outside the Net Balance. */
  leftOut: { count: number; total: number };
};

/**
 * Where the money sits: the accounts counted in the Net Balance split by type, plus
 * what stays outside it. A credit account is outside by default, so its debt is
 * reported on its own instead of being taken off the split.
 */
export function summariseAccountMix(
  accounts: Pick<AccountRow, "id" | "account_type" | "include_in_net_balance">[],
  balances: Record<string, number>
): AccountMix {
  const byType = new Map<AccountType, { count: number; total: number }>();
  const owedOnCredit = { count: 0, total: 0 };
  const leftOut = { count: 0, total: 0 };

  for (const acc of accounts) {
    const balance = balances[acc.id] ?? 0;
    if (acc.include_in_net_balance) {
      const group = byType.get(acc.account_type) ?? { count: 0, total: 0 };
      group.count += 1;
      group.total += balance;
      byType.set(acc.account_type, group);
    } else if (acc.account_type === "credit") {
      // A card with nothing owed on it has nothing to report here.
      if (balance < 0) {
        owedOnCredit.count += 1;
        owedOnCredit.total -= balance;
      }
    } else {
      leftOut.count += 1;
      leftOut.total += balance;
    }
  }

  const totals = Array.from(byType, ([type, g]) => ({ type, count: g.count, total: roundToCents(g.total) }));
  const held = totals.reduce((s, g) => s + Math.max(0, g.total), 0);

  return {
    groups: totals
      .map((g) => ({ ...g, share: g.total > 0 && held > 0 ? g.total / held : null }))
      .sort((a, b) => b.total - a.total),
    owedOnCredit: { count: owedOnCredit.count, total: roundToCents(owedOnCredit.total) },
    leftOut: { count: leftOut.count, total: roundToCents(leftOut.total) },
  };
}

/** How an account sits against the limit or the minimum set on it. */
export type AccountStanding =
  | {
      kind: "credit";
      limit: number;
      /** What is owed, never below zero. */
      used: number;
      /** What can still be spent, never below zero. */
      left: number;
      /** `used` against `limit`, 0 to 1. */
      ratio: number;
      overLimit: boolean;
    }
  | {
      kind: "minimum";
      minimum: number;
      below: boolean;
      /** How far under the minimum the balance is; 0 when it is not below. */
      shortBy: number;
      /** The balance against `minimum`, 0 to 1. */
      ratio: number;
    };

/**
 * A credit account is measured against its credit limit, any other account against
 * its maintaining balance. Null when neither is set.
 */
export function accountStanding(
  account: Pick<AccountRow, "account_type" | "credit_limit" | "maintaining_balance">,
  balance: number
): AccountStanding | null {
  if (account.account_type === "credit") {
    const limit = account.credit_limit ?? 0;
    if (limit <= 0) return null;
    const used = roundToCents(Math.max(0, -balance));
    return {
      kind: "credit",
      limit,
      used,
      left: roundToCents(Math.max(0, limit - used)),
      ratio: Math.min(1, used / limit),
      overLimit: used > limit,
    };
  }

  const minimum = account.maintaining_balance ?? 0;
  if (minimum <= 0) return null;
  const below = balance < minimum;
  return {
    kind: "minimum",
    minimum,
    below,
    shortBy: below ? roundToCents(minimum - balance) : 0,
    ratio: Math.max(0, Math.min(1, balance / minimum)),
  };
}

"use server";

import { createClient } from "@/lib/supabase/server";

export type AccountTransactionType = "expense" | "income" | "adjustment" | "transfer" | "fee" | "auto_pay";

export type AccountTransactionRow = {
  id: string;
  account_id: string;
  type: AccountTransactionType;
  /** Signed: positive = inflow, negative = outflow. */
  amount: number;
  description: string;
  transfer_group_id: string | null;
  /** For transfers, the other account participating in the pair (if it still exists). */
  transfer_counterpart?: {
    account_id: string;
    account_alias: string | null;
  } | null;
  occurred_at: string;
  created_at: string;
};

async function getProfileId(): Promise<{ profileId: string | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profileId: null, error: "Not logged in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { profileId: null, error: "Profile not found." };
  return { profileId: profile.id };
}

async function assertOwnsAccount(accountId: string, profileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) return error.message;
  if (!data) return "Account not found.";
  return null;
}

async function getAccountStartingBalance(accountId: string, profileId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("starting_balance")
    .eq("id", accountId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return Number(data?.starting_balance ?? 0);
}

export async function loadAccountTransactions(accountId: string): Promise<{
  transactions: AccountTransactionRow[];
  balance: number;
  error?: string;
}> {
  const { profileId, error: pErr } = await getProfileId();
  if (pErr || !profileId) return { transactions: [], balance: 0, error: pErr };

  const supabase = await createClient();
  const ownErr = await assertOwnsAccount(accountId, profileId);
  if (ownErr) return { transactions: [], balance: 0, error: ownErr };

  const { data: rows, error } = await supabase
    .from("account_transactions")
    .select("id, account_id, type, amount, description, transfer_group_id, occurred_at, created_at")
    .eq("account_id", accountId)
    .eq("profile_id", profileId)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return { transactions: [], balance: 0, error: error.message };

  const transferGroupIds = Array.from(
    new Set((rows ?? []).map((r) => r.transfer_group_id).filter((g): g is string => !!g)),
  );

  let counterpartByGroup: Map<string, { account_id: string; account_alias: string | null }> = new Map();
  if (transferGroupIds.length > 0) {
    const { data: pairRows } = await supabase
      .from("account_transactions")
      .select("transfer_group_id, account_id, accounts!inner(account_alias)")
      .in("transfer_group_id", transferGroupIds)
      .eq("profile_id", profileId)
      .neq("account_id", accountId);

    for (const r of (pairRows ?? []) as Array<{
      transfer_group_id: string | null;
      account_id: string;
      accounts: { account_alias: string | null } | { account_alias: string | null }[] | null;
    }>) {
      if (!r.transfer_group_id) continue;
      const aliasField = Array.isArray(r.accounts) ? r.accounts[0] : r.accounts;
      counterpartByGroup.set(r.transfer_group_id, {
        account_id: r.account_id,
        account_alias: aliasField?.account_alias ?? null,
      });
    }
  }

  const transactions: AccountTransactionRow[] = (rows ?? []).map((r) => ({
    id: String(r.id),
    account_id: String(r.account_id),
    type: r.type as AccountTransactionType,
    amount: Number(r.amount),
    description: String(r.description ?? ""),
    transfer_group_id: r.transfer_group_id ? String(r.transfer_group_id) : null,
    transfer_counterpart: r.transfer_group_id ? counterpartByGroup.get(String(r.transfer_group_id)) ?? null : null,
    occurred_at: String(r.occurred_at),
    created_at: String(r.created_at),
  }));

  const startingBalance = await getAccountStartingBalance(accountId, profileId);
  const balance = startingBalance + transactions.reduce((s, t) => s + t.amount, 0);

  return { transactions, balance };
}

// ─── Create ──────────────────────────────────────────────────────────────────

type SimpleEntryInput = {
  accountId: string;
  amount: number;
  description?: string;
  occurredAt?: string;
};

function validatePositiveAmount(amount: number): string | null {
  if (!Number.isFinite(amount)) return "Amount must be a number.";
  if (amount <= 0) return "Amount must be greater than zero.";
  return null;
}

async function insertSimpleTransaction(
  input: SimpleEntryInput,
  type: AccountTransactionType,
  signedAmount: number,
): Promise<{ error?: string }> {
  const { profileId, error: pErr } = await getProfileId();
  if (pErr || !profileId) return { error: pErr };
  const ownErr = await assertOwnsAccount(input.accountId, profileId);
  if (ownErr) return { error: ownErr };

  const supabase = await createClient();
  const { error } = await supabase.from("account_transactions").insert({
    profile_id: profileId,
    account_id: input.accountId,
    type,
    amount: signedAmount,
    description: (input.description ?? "").trim(),
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  });
  if (error) return { error: error.message };
  return {};
}

export async function createAccountExpense(input: SimpleEntryInput): Promise<{ error?: string }> {
  const v = validatePositiveAmount(input.amount);
  if (v) return { error: v };
  return insertSimpleTransaction(input, "expense", -Math.abs(input.amount));
}

export async function createAccountFee(input: SimpleEntryInput): Promise<{ error?: string }> {
  const v = validatePositiveAmount(input.amount);
  if (v) return { error: v };
  return insertSimpleTransaction(input, "fee", -Math.abs(input.amount));
}

export async function createAccountIncome(input: SimpleEntryInput): Promise<{ error?: string }> {
  const v = validatePositiveAmount(input.amount);
  if (v) return { error: v };
  return insertSimpleTransaction(input, "income", Math.abs(input.amount));
}

/** Adjustment: signed amount (positive = top up, negative = deduct). */
export async function createAccountAdjustment(input: {
  accountId: string;
  /** Signed amount — positive adds to balance, negative subtracts. */
  amount: number;
  description?: string;
  occurredAt?: string;
}): Promise<{ error?: string }> {
  if (!Number.isFinite(input.amount) || input.amount === 0) {
    return { error: "Adjustment amount must be a non-zero number." };
  }
  return insertSimpleTransaction(
    { accountId: input.accountId, amount: input.amount, description: input.description, occurredAt: input.occurredAt },
    "adjustment",
    input.amount,
  );
}

export async function createAccountTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  occurredAt?: string;
}): Promise<{ error?: string }> {
  if (input.fromAccountId === input.toAccountId) return { error: "Source and destination must differ." };
  const v = validatePositiveAmount(input.amount);
  if (v) return { error: v };

  const { profileId, error: pErr } = await getProfileId();
  if (pErr || !profileId) return { error: pErr };

  const supabase = await createClient();
  const { data: bothAccounts, error: accErr } = await supabase
    .from("accounts")
    .select("id")
    .eq("profile_id", profileId)
    .in("id", [input.fromAccountId, input.toAccountId]);
  if (accErr) return { error: accErr.message };
  if ((bothAccounts ?? []).length !== 2) return { error: "Both accounts must exist and belong to you." };

  // Generate a shared transfer_group_id client-side (server-side via crypto.randomUUID).
  const transferGroupId = crypto.randomUUID();
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const description = (input.description ?? "").trim();
  const amount = Math.abs(input.amount);

  const { error } = await supabase.from("account_transactions").insert([
    {
      profile_id: profileId,
      account_id: input.fromAccountId,
      type: "transfer",
      amount: -amount,
      description,
      transfer_group_id: transferGroupId,
      occurred_at: occurredAt,
    },
    {
      profile_id: profileId,
      account_id: input.toAccountId,
      type: "transfer",
      amount: amount,
      description,
      transfer_group_id: transferGroupId,
      occurred_at: occurredAt,
    },
  ]);
  if (error) return { error: error.message };
  return {};
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteAccountTransaction(transactionId: string): Promise<{ error?: string }> {
  const { profileId, error: pErr } = await getProfileId();
  if (pErr || !profileId) return { error: pErr };

  const supabase = await createClient();
  // Look up the row to detect transfer pair.
  const { data: row, error: lookupErr } = await supabase
    .from("account_transactions")
    .select("id, transfer_group_id")
    .eq("id", transactionId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (lookupErr) return { error: lookupErr.message };
  if (!row) return { error: "Transaction not found." };

  if (row.transfer_group_id) {
    const { error } = await supabase
      .from("account_transactions")
      .delete()
      .eq("transfer_group_id", row.transfer_group_id)
      .eq("profile_id", profileId);
    if (error) return { error: error.message };
    return {};
  }

  const { error } = await supabase
    .from("account_transactions")
    .delete()
    .eq("id", transactionId)
    .eq("profile_id", profileId);
  if (error) return { error: error.message };
  return {};
}

"use server";

import { createClient } from "@/lib/supabase/server";

export type AccountType = "debit" | "credit" | "savings" | "stocks" | "crypto" | "collectibles" | "asset";
export type InterestFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "annually";

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
  include_in_net_balance: boolean;
  currency: string;
};

const ACCOUNT_SELECT =
  "id, account_alias, bank_name, tags, color, account_type, starting_balance, interest_frequency, interest_rate, maintaining_balance, include_in_net_balance, currency";

function mapAccountRow(r: Record<string, unknown>): AccountRow {
  const type = String(r.account_type ?? "debit") as AccountType;
  const freqRaw = r.interest_frequency == null ? null : String(r.interest_frequency);
  return {
    id: String(r.id),
    account_alias: String(r.account_alias ?? ""),
    bank_name: String(r.bank_name ?? ""),
    tags: Array.isArray(r.tags) ? (r.tags as unknown[]).map(String) : [],
    color: String(r.color ?? "#6366f1"),
    account_type: (["debit", "credit", "savings", "stocks", "crypto", "collectibles", "asset"].includes(type) ? type : "debit") as AccountType,
    starting_balance: Number(r.starting_balance ?? 0),
    interest_frequency:
      freqRaw && ["daily", "weekly", "monthly", "quarterly", "annually"].includes(freqRaw)
        ? (freqRaw as InterestFrequency)
        : null,
    interest_rate: r.interest_rate != null ? Number(r.interest_rate) : null,
    maintaining_balance: r.maintaining_balance != null ? Number(r.maintaining_balance) : null,
    include_in_net_balance: r.include_in_net_balance !== false,
    currency: String(r.currency ?? "PHP"),
  };
}

export async function loadAccount(accountId: string): Promise<{ account: AccountRow | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { account: null, error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { account: null };

  const { data: row, error } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("id", accountId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (error) return { account: null, error: error.message };
  if (!row) return { account: null };

  return { account: mapAccountRow(row) };
}

export async function loadAccounts(): Promise<{ accounts: AccountRow[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { accounts: [], error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { accounts: [] };

  const { data: rows, error } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });

  if (error) return { accounts: [], error: error.message };

  return { accounts: (rows ?? []).map(mapAccountRow) };
}

/**
 * Per-account live balance = starting_balance + SUM(account_transactions.amount).
 * Intentionally ignores expense_entries / bills that merely tag an account.
 */
export async function loadAccountBalances(): Promise<{
  balances: Record<string, number>;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { balances: {}, error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { balances: {} };

  const [{ data: accountRows, error: accErr }, { data: txRows, error: txErr }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, starting_balance")
      .eq("profile_id", profile.id),
    supabase
      .from("account_transactions")
      .select("account_id, amount")
      .eq("profile_id", profile.id),
  ]);

  if (accErr) return { balances: {}, error: accErr.message };
  if (txErr) return { balances: {}, error: txErr.message };

  const balances: Record<string, number> = {};
  for (const a of accountRows ?? []) {
    balances[String(a.id)] = Number(a.starting_balance ?? 0);
  }
  for (const r of txRows ?? []) {
    const id = r.account_id as string | null;
    if (!id) continue;
    balances[id] = (balances[id] ?? 0) + Number(r.amount);
  }
  return { balances };
}

/**
 * Daily Net Balance series for the last `days` days (inclusive of today).
 * Net Balance = sum of (starting_balance + cumulative tx amounts) for accounts where
 * include_in_net_balance is true, evaluated at end-of-day.
 */
export async function loadNetBalanceHistory(days = 7): Promise<{
  series: { date: string; balance: number }[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { series: [], error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { series: [] };

  const { data: netAccounts, error: accErr } = await supabase
    .from("accounts")
    .select("id, starting_balance, starting_balance_date")
    .eq("profile_id", profile.id)
    .eq("include_in_net_balance", true);
  if (accErr) return { series: [], error: accErr.message };

  const netIds = new Set((netAccounts ?? []).map((a) => String(a.id)));
  const accountsWithDates = (netAccounts ?? []).map((a) => ({
    id: String(a.id),
    startingBalance: Number(a.starting_balance ?? 0),
    effectiveDate: new Date(a.starting_balance_date as string),
  }));

  let txRows: { account_id: string; amount: number; occurred_at: string }[] = [];
  if (netIds.size > 0) {
    const { data, error } = await supabase
      .from("account_transactions")
      .select("account_id, amount, occurred_at")
      .eq("profile_id", profile.id)
      .in("account_id", Array.from(netIds));
    if (error) return { series: [], error: error.message };
    txRows = (data ?? []).map((r) => ({
      account_id: String(r.account_id),
      amount: Number(r.amount),
      occurred_at: String(r.occurred_at),
    }));
  }

  const series: { date: string; balance: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    const startingTotal = accountsWithDates.reduce((s, a) => s + a.startingBalance, 0);
    const cumulative = txRows
      .filter((t) => new Date(t.occurred_at).getTime() <= endOfDay.getTime())
      .reduce((s, t) => s + t.amount, 0);
    series.push({
      date: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
      balance: startingTotal + cumulative,
    });
  }

  return { series };
}

type AccountInput = {
  account_alias: string;
  bank_name: string;
  tags: string[];
  color: string;
  account_type: AccountType;
  starting_balance: number;
  interest_frequency: InterestFrequency | null;
  interest_rate: number | null;
  maintaining_balance: number | null;
  include_in_net_balance: boolean;
  currency: string;
};

function validateInput(input: AccountInput): string | null {
  if (!input.account_alias.trim()) return "Account alias is required.";
  if (!input.bank_name.trim()) return "Bank name is required.";
  if (!["debit", "credit", "savings", "stocks", "crypto", "collectibles", "asset"].includes(input.account_type)) {
    return "Invalid account type.";
  }
  if (!Number.isFinite(input.starting_balance)) {
    return "Starting balance must be a number.";
  }
  if (
    input.interest_frequency != null &&
    !["daily", "weekly", "monthly", "quarterly", "annually"].includes(input.interest_frequency)
  ) {
    return "Invalid interest frequency.";
  }
  if (!input.currency || input.currency.trim().length < 3) {
    return "Currency is required.";
  }
  return null;
}

export async function createAccount(input: AccountInput): Promise<{ error?: string }> {
  const err = validateInput(input);
  if (err) return { error: err };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  let { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) {
    const { data: inserted, error: insErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, net_take_home: 0, currency: "PHP" })
      .select("id")
      .single();
    if (insErr || !inserted) return { error: insErr?.message ?? "Could not create profile." };
    profile = inserted;
  }

  const { error } = await supabase.from("accounts").insert({
    profile_id: profile.id,
    account_alias: input.account_alias.trim(),
    bank_name: input.bank_name.trim(),
    tags: input.tags,
    color: input.color,
    account_type: input.account_type,
    starting_balance: input.starting_balance,
    starting_balance_date: new Date().toISOString(),
    interest_frequency: input.interest_frequency,
    interest_rate: input.interest_rate,
    maintaining_balance: input.maintaining_balance,
    include_in_net_balance: input.include_in_net_balance,
    currency: input.currency.trim().toUpperCase(),
  });

  if (error) return { error: error.message };
  return {};
}

export async function updateAccount(accountId: string, input: AccountInput): Promise<{ error?: string }> {
  const err = validateInput(input);
  if (err) return { error: err };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };

  const { error } = await supabase
    .from("accounts")
    .update({
      account_alias: input.account_alias.trim(),
      bank_name: input.bank_name.trim(),
      tags: input.tags,
      color: input.color,
      account_type: input.account_type,
      starting_balance: input.starting_balance,
      starting_balance_date: new Date().toISOString(),
      interest_frequency: input.interest_frequency,
      interest_rate: input.interest_rate,
      maintaining_balance: input.maintaining_balance,
      include_in_net_balance: input.include_in_net_balance,
      currency: input.currency.trim().toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteAccount(accountId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };

  // Null out references before delete (FK cascade removed to support static account IDs).
  await Promise.all([
    supabase.from("expense_entries").update({ account_id: null }).eq("account_id", accountId).eq("profile_id", profile.id),
    supabase.from("bills").update({ account_id: null }).eq("account_id", accountId).eq("profile_id", profile.id),
  ]);

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  return {};
}

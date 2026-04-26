"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentPaidMonth } from "@/lib/paid-month";

export type AccountRow = {
  id: string;
  account_alias: string;
  bank_name: string;
  tags: string[];
  color: string;
};


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
    .select("id, account_alias, bank_name, tags, color")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });

  if (error) return { accounts: [], error: error.message };

  return {
    accounts: (rows ?? []).map((r) => ({
      id: String(r.id),
      account_alias: String(r.account_alias ?? ""),
      bank_name: String(r.bank_name ?? ""),
      tags: Array.isArray(r.tags) ? (r.tags as unknown[]).map(String) : [],
      color: String(r.color ?? "#6366f1"),
    })),
  };
}

export async function loadAccountTotals(paidMonth?: string): Promise<{
  expenseTotals: Record<string, number>;
  billTotals: Record<string, number>;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { expenseTotals: {}, billTotals: {}, error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { expenseTotals: {}, billTotals: {} };

  const month = paidMonth && /^\d{4}-\d{2}$/.test(paidMonth) ? paidMonth : getCurrentPaidMonth();
  const [year, mon] = month.split("-").map(Number);
  const monthStart = `${month}-01T00:00:00`;
  const nextYear = mon === 12 ? year + 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const monthEnd = `${nextYear}-${String(nextMon).padStart(2, "0")}-01T00:00:00`;

  const [{ data: expRows }, { data: billRows }] = await Promise.all([
    supabase
      .from("expense_entries")
      .select("account_id, amount")
      .eq("profile_id", profile.id)
      .not("account_id", "is", null)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd),
    supabase
      .from("bills")
      .select("account_id, amount")
      .eq("profile_id", profile.id)
      .not("account_id", "is", null)
      .eq("billing_period", "monthly"),
  ]);

  const expenseTotals: Record<string, number> = {};
  for (const e of expRows ?? []) {
    const id = e.account_id as string | null;
    if (id) expenseTotals[id] = (expenseTotals[id] ?? 0) + Number(e.amount);
  }

  const billTotals: Record<string, number> = {};
  for (const b of billRows ?? []) {
    const id = b.account_id as string | null;
    if (id) billTotals[id] = (billTotals[id] ?? 0) + Number(b.amount);
  }

  return { expenseTotals, billTotals };
}

type AccountInput = {
  account_alias: string;
  bank_name: string;
  tags: string[];
  color: string;
};

function validateInput(input: AccountInput): string | null {
  if (!input.account_alias.trim()) return "Account alias is required.";
  if (!input.bank_name.trim()) return "Bank name is required.";
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

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BudgetState, ExpenseCategoryKey } from "@/types/database.types";
import { EXPENSE_CATEGORIES } from "@/types/database.types";

export async function getNetTakeHome(): Promise<number | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("net_take_home")
    .eq("user_id", user.id)
    .single();
  if (!profile) return null;
  const value = Number(profile.net_take_home);
  return value > 0 ? value : null;
}

export type ExpenseEntryRow = {
  id: string;
  category_id: ExpenseCategoryKey;
  amount: number;
  note?: string | null;
};

export type ExpenseData = {
  netTakeHome: number;
  entries: ExpenseEntryRow[];
};

export async function loadExpenseData(): Promise<ExpenseData | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, net_take_home")
    .eq("user_id", user.id)
    .single();
  if (!profile) return null;

  const { data: entries } = await supabase
    .from("expense_entries")
    .select("id, category_id, amount, note")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });

  return {
    netTakeHome: Number(profile.net_take_home),
    entries: (entries ?? []).map((row) => ({
      id: row.id,
      category_id: row.category_id as ExpenseCategoryKey,
      amount: Number(row.amount),
      note: row.note ?? undefined,
    })),
  };
}

export async function loadBudget(): Promise<BudgetState | null> {
  const data = await loadExpenseData();
  if (!data) return null;
  const expenses = EXPENSE_CATEGORIES.reduce(
    (acc, cat) => ({ ...acc, [cat.id]: 0 }),
    {} as Record<ExpenseCategoryKey, number>
  );
  data.entries.forEach((row) => {
    if (row.category_id in expenses) {
      expenses[row.category_id] += row.amount;
    }
  });
  return {
    netTakeHome: data.netTakeHome,
    expenses,
  };
}

export async function updateNetTakeHome(amount: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) return { error: `Auth: ${authError.message}` };
  if (!user) return { error: "Not logged in." };

  const value = Math.max(0, amount);

  let { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: `Fetch profile: ${fetchError.message}` };

  if (!profile) {
    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, net_take_home: value, currency: "PHP" })
      .select("id, net_take_home")
      .single();
    if (insertErr) return { error: `Save failed: ${insertErr.message}` };
    if (!newProfile) return { error: "Save failed: no profile returned." };
    revalidatePath("/dashboard");
    revalidatePath("/");
    return {};
  }

  const { data: updated, error: updateErr } = await supabase
    .from("profiles")
    .update({ net_take_home: value, updated_at: new Date().toISOString() })
    .eq("id", profile.id)
    .eq("user_id", user.id)
    .select("net_take_home")
    .single();

  if (updateErr) return { error: `Save failed: ${updateErr.message}` };
  if (!updated) return { error: "Save failed: update did not apply. Check RLS policies." };
  revalidatePath("/dashboard");
  revalidatePath("/");
  return {};
}

export async function addExpense(
  categoryId: ExpenseCategoryKey,
  amount: number,
  note?: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  let { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) {
    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, net_take_home: 0, currency: "PHP" })
      .select("id")
      .single();
    if (insertErr || !newProfile) return { error: insertErr?.message ?? "Could not create profile." };
    profile = newProfile;
  }
  if (amount <= 0) return { error: "Amount must be greater than 0." };
  const { error } = await supabase
    .from("expense_entries")
    .insert({
      profile_id: profile.id,
      category_id: categoryId,
      amount,
      ...(note !== undefined && { note: note.trim() || null }),
    });
  return error ? { error: error.message } : {};
}

export async function updateExpense(
  entryId: string,
  categoryId: ExpenseCategoryKey,
  amount: number,
  note?: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };
  if (amount <= 0) return { error: "Amount must be greater than 0." };
  const { error } = await supabase
    .from("expense_entries")
    .update({
      category_id: categoryId,
      amount,
      ...(note !== undefined && { note: note || null }),
    })
    .eq("id", entryId)
    .eq("profile_id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/");
  return {};
}

export async function deleteExpense(entryId: string): Promise<{ error?: string }> {
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
    .from("expense_entries")
    .delete()
    .eq("id", entryId)
    .eq("profile_id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/");
  return {};
}

export async function saveBudget(state: BudgetState): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  let { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, net_take_home: 0, currency: "PHP" })
      .select("id")
      .single();
    if (insertErr || !newProfile) return { error: insertErr?.message ?? "Could not create profile." };
    profile = newProfile;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      net_take_home: state.netTakeHome,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) return { error: updateError.message };

  await supabase.from("expense_entries").delete().eq("profile_id", profile.id);

  const rows = (Object.entries(state.expenses) as [ExpenseCategoryKey, number][])
    .filter(([, amount]) => amount > 0)
    .map(([category_id, amount]) => ({
      profile_id: profile.id,
      category_id,
      amount,
    }));

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("expense_entries")
      .insert(rows);
    if (insertError) return { error: insertError.message };
  }

  return {};
}

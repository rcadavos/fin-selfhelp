"use server";

import { createClient } from "@/lib/supabase/server";
import type { BudgetState, ExpenseCategoryKey } from "@/types/database.types";
import { EXPENSE_CATEGORIES } from "@/types/database.types";

export async function loadBudget(): Promise<BudgetState | null> {
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
    .select("category_id, amount")
    .eq("profile_id", profile.id);

  const expenses = EXPENSE_CATEGORIES.reduce(
    (acc, cat) => ({ ...acc, [cat.id]: 0 }),
    {} as Record<ExpenseCategoryKey, number>
  );
  entries?.forEach((row) => {
    if (row.category_id in expenses) {
      expenses[row.category_id as ExpenseCategoryKey] = Number(row.amount);
    }
  });

  return {
    netTakeHome: Number(profile.net_take_home),
    expenses,
  };
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

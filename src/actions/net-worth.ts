"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NetWorthCategoryKey, NetWorthItemType, NetWorthUseType } from "@/types/database.types";
import { NET_WORTH_DECLARABLE_EXPENSE_CATEGORIES } from "@/types/database.types";

export type NetWorthItemRow = {
  id: string;
  type: NetWorthItemType;
  category_key: NetWorthCategoryKey;
  name: string | null;
  amount_cents: number;
  currency: string;
  use_type: NetWorthUseType;
};

export type ExpenseTotalByCategory = {
  category_id: string;
  total_amount: number;
};

export type NetWorthData = {
  items: NetWorthItemRow[];
  expenseTotalsByCategory: ExpenseTotalByCategory[];
};

/** Load only expense totals by category for "Add from expenses" suggestions. Net worth items are stored in localStorage. */
export async function loadExpenseTotalsForNetWorthSuggestions(): Promise<ExpenseTotalByCategory[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return null;

  const { data: entries } = await supabase
    .from("expense_entries")
    .select("category_id, amount")
    .eq("profile_id", profile.id);

  const list = entries ?? [];
  const totalsByCategory = new Map<string, number>();
  for (const e of list) {
    const cat = String(e.category_id ?? "");
    const amt = Number(e.amount ?? 0);
    totalsByCategory.set(cat, (totalsByCategory.get(cat) ?? 0) + amt);
  }
  return Array.from(totalsByCategory.entries()).map(([category_id, total_amount]) => ({
    category_id,
    total_amount,
  }));
}

export async function addNetWorthItem(
  type: NetWorthItemType,
  categoryKey: NetWorthCategoryKey,
  amountCents: number,
  name?: string | null,
  useType?: NetWorthUseType | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };

  if (amountCents <= 0) return { error: "Amount must be greater than 0." };

  const { error } = await supabase.from("net_worth_items").insert({
    profile_id: profile.id,
    type,
    category_key: categoryKey,
    name: name?.trim() || null,
    amount_cents: amountCents,
    currency: "PHP",
    use_type: useType ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  return {};
}

export async function updateNetWorthItem(
  itemId: string,
  updates: {
    type?: NetWorthItemType;
    category_key?: NetWorthCategoryKey;
    name?: string | null;
    amount_cents?: number;
    use_type?: NetWorthUseType | null;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };

  if (updates.amount_cents != null && updates.amount_cents <= 0) {
    return { error: "Amount must be greater than 0." };
  }

  const payload: Record<string, unknown> = {};
  if (updates.type != null) payload.type = updates.type;
  if (updates.category_key != null) payload.category_key = updates.category_key;
  if (updates.name !== undefined) payload.name = updates.name?.trim() || null;
  if (updates.amount_cents != null) payload.amount_cents = updates.amount_cents;
  if (updates.use_type !== undefined) payload.use_type = updates.use_type ?? null;

  const { error } = await supabase
    .from("net_worth_items")
    .update(payload)
    .eq("id", itemId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  return {};
}

/** Read-only: partner's net worth rows from DB when they enabled sharing. */
export async function loadSharedNetWorthItems(grantorUserId: string): Promise<NetWorthItemRow[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: grantorProfile } = await supabase.from("profiles").select("id").eq("user_id", grantorUserId).single();
  if (!grantorProfile) return null;

  const { data: share } = await supabase
    .from("account_shares")
    .select("id")
    .eq("grantor_profile_id", grantorProfile.id)
    .eq("grantee_user_id", user.id)
    .eq("status", "accepted")
    .eq("can_view_net_worth", true)
    .maybeSingle();
  if (!share) return null;

  const { data, error } = await supabase
    .from("net_worth_items")
    .select("id, type, category_key, name, amount_cents, currency, use_type")
    .eq("profile_id", grantorProfile.id)
    .order("created_at", { ascending: true });

  if (error) return null;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    type: row.type as NetWorthItemRow["type"],
    category_key: row.category_key as NetWorthCategoryKey,
    name: row.name as string | null,
    amount_cents: Number(row.amount_cents),
    currency: String(row.currency ?? "PHP"),
    use_type: (row.use_type as NetWorthItemRow["use_type"]) ?? null,
  }));
}

export async function deleteNetWorthItem(itemId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!profile) return { error: "Profile not found." };

  const { error } = await supabase
    .from("net_worth_items")
    .delete()
    .eq("id", itemId)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-expenses");
  return {};
}

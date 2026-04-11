"use server";

import { createClient } from "@/lib/supabase/server";
import type { ToBuyCategory, ToBuyItem } from "@/lib/to-buy-storage";

const VALID_CATEGORIES: ToBuyCategory[] = [
  "grocery",
  "household",
  "electronics",
  "clothing",
  "health",
  "other",
];

function normalizeCategory(c: string): ToBuyCategory {
  return (VALID_CATEGORIES.includes(c as ToBuyCategory) ? c : "other") as ToBuyCategory;
}

type ToBuyDbRow = {
  id: string;
  name: string;
  quantity: number;
  estimated_price: string;
  category: string;
  checked: boolean;
  created_at: string;
};

function rowToItem(row: ToBuyDbRow): ToBuyItem {
  return {
    id: row.id,
    name: row.name,
    quantity: row.quantity,
    estimatedPrice: row.estimated_price ?? "",
    category: normalizeCategory(row.category),
    checked: row.checked,
    createdAt: row.created_at,
  };
}

async function getMyProfileId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." as const, profileId: null as string | null };
  const { data: profile, error } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  if (error || !profile) return { error: "Profile not found." as const, profileId: null };
  return { error: null, profileId: profile.id as string };
}

export async function loadMyToBuyFromServer(): Promise<{ error?: string; items?: ToBuyItem[] }> {
  const supabase = await createClient();
  const { error: e, profileId } = await getMyProfileId(supabase);
  if (e || !profileId) return { error: e ?? "Not logged in." };

  const { data, error } = await supabase
    .from("to_buy_items")
    .select("id, name, quantity, estimated_price, category, checked, created_at")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return { items: (data ?? []).map((r) => rowToItem(r as ToBuyDbRow)) };
}

export async function replaceMyToBuyOnServer(items: ToBuyItem[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error: e, profileId } = await getMyProfileId(supabase);
  if (e || !profileId) return { error: e ?? "Not logged in." };

  const { error: delErr } = await supabase.from("to_buy_items").delete().eq("profile_id", profileId);
  if (delErr) return { error: delErr.message };

  if (items.length === 0) return {};

  const rows = items.map((it, i) => ({
    id: it.id,
    profile_id: profileId,
    name: it.name.trim() || "Item",
    quantity: Math.max(1, it.quantity),
    estimated_price: it.estimatedPrice ?? "",
    category: normalizeCategory(it.category),
    checked: it.checked,
    created_at: it.createdAt || new Date().toISOString(),
    sort_order: i,
  }));

  const { error: insErr } = await supabase.from("to_buy_items").insert(rows);
  if (insErr) return { error: insErr.message };
  return {};
}

export async function loadSharedToBuyForGrantor(
  grantorUserId: string
): Promise<{ error?: string; items?: ToBuyItem[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: grantorProfile } = await supabase.from("profiles").select("id").eq("user_id", grantorUserId).single();
  if (!grantorProfile) return { error: "Account not found." };

  const { data: share } = await supabase
    .from("account_shares")
    .select("id")
    .eq("grantor_profile_id", grantorProfile.id)
    .eq("grantee_user_id", user.id)
    .eq("status", "accepted")
    .eq("can_view_to_buy", true)
    .maybeSingle();
  if (!share) return { error: "No shared access to this list." };

  const { data, error } = await supabase
    .from("to_buy_items")
    .select("id, name, quantity, estimated_price, category, checked, created_at")
    .eq("profile_id", grantorProfile.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return { items: (data ?? []).map((r) => rowToItem(r as ToBuyDbRow)) };
}

function parseRpcOk(data: unknown): { ok?: boolean; error?: string } | null {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as { ok?: boolean; error?: string };
    } catch {
      return null;
    }
  }
  if (typeof data === "object" && !Array.isArray(data)) {
    return data as { ok?: boolean; error?: string };
  }
  return null;
}

/** Grantee crosses items off the partner list (updates `checked` only). */
export async function granteeSharedSetToBuyChecked(
  itemId: string,
  checked: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data, error } = await supabase.rpc("grantee_set_to_buy_item_checked", {
    p_item_id: itemId,
    p_checked: checked,
  });
  if (error) return { error: error.message };
  const result = parseRpcOk(data);
  if (!result?.ok) return { error: result?.error?.replace(/_/g, " ") ?? "Could not update item." };
  return {};
}

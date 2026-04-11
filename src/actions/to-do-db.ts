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

type ToDoDbRow = {
  id: string;
  name: string;
  quantity: number;
  estimated_price: string;
  category: string;
  checked: boolean;
  created_at: string;
};

function rowToItem(row: ToDoDbRow): ToBuyItem {
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

export async function loadMyToDoFromServer(): Promise<{ error?: string; items?: ToBuyItem[] }> {
  const supabase = await createClient();
  const { error: e, profileId } = await getMyProfileId(supabase);
  if (e || !profileId) return { error: e ?? "Not logged in." };

  const { data, error } = await supabase
    .from("to_do_items")
    .select("id, name, quantity, estimated_price, category, checked, created_at")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return { items: (data ?? []).map((r) => rowToItem(r as ToDoDbRow)) };
}

export async function replaceMyToDoOnServer(items: ToBuyItem[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error: e, profileId } = await getMyProfileId(supabase);
  if (e || !profileId) return { error: e ?? "Not logged in." };

  const { error: delErr } = await supabase.from("to_do_items").delete().eq("profile_id", profileId);
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

  const { error: insErr } = await supabase.from("to_do_items").insert(rows);
  if (insErr) return { error: insErr.message };
  return {};
}

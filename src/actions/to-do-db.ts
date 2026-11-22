"use server";

import { createClient } from "@/lib/supabase/server";
import {
  REMINDER_CATEGORIES,
  REMINDER_REPEATS,
  type ReminderRepeat,
  type ToBuyCategory,
  type ToBuyItem,
} from "@/lib/to-buy-storage";
import {
  FREE_TIER_MAX_LIST_ITEMS,
  hasProLevelProductAccess,
  normalizeDbTier,
} from "@/lib/subscription-tier";

const VALID_CATEGORIES = new Set<string>(REMINDER_CATEGORIES.map((c) => c.value));

/** To-Buy categories from before migration 087, mapped the same way that migration did. */
const LEGACY_CATEGORIES: Record<string, ToBuyCategory> = {
  grocery: "pantry",
  household: "errand",
  electronics: "other",
  clothing: "other",
};

function normalizeCategory(c: string): ToBuyCategory {
  if (VALID_CATEGORIES.has(c)) return c as ToBuyCategory;
  return LEGACY_CATEGORIES[c] ?? "other";
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d/;

/** `HH:MM` from a Postgres `time` ("15:00:00") or the client ("15:00"); null when absent or malformed. */
function normalizeTime(t: string | null | undefined): string | null {
  return t && TIME_RE.test(t) ? t.slice(0, 5) : null;
}

function normalizeRepeat(r: string | null | undefined): ReminderRepeat | null {
  return r && (REMINDER_REPEATS as string[]).includes(r) ? (r as ReminderRepeat) : null;
}

type ToDoDbRow = {
  id: string;
  name: string;
  quantity: number;
  estimated_price: string;
  category: string;
  checked: boolean;
  target_date: string | null;
  target_time: string | null;
  repeat_rule: string | null;
  repeat_anchor: string | null;
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
    targetDate: row.target_date,
    targetTime: normalizeTime(row.target_time),
    repeat: normalizeRepeat(row.repeat_rule),
    repeatAnchor: row.repeat_anchor,
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
    .select(
      "id, name, quantity, estimated_price, category, checked, target_date, target_time, repeat_rule, repeat_anchor, created_at"
    )
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

  const { data: prof } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_ends_at, is_subscriber")
    .eq("id", profileId)
    .maybeSingle();
  const tier = normalizeDbTier(prof?.subscription_tier as string | null);
  const hasPro = hasProLevelProductAccess(
    tier,
    (prof?.subscription_ends_at as string | null) ?? null,
    Boolean(prof?.is_subscriber)
  );
  if (!hasPro && items.length > FREE_TIER_MAX_LIST_ITEMS) {
    return {
      error: `Free plan allows up to ${FREE_TIER_MAX_LIST_ITEMS} to-do items. Upgrade to Pro for unlimited.`,
    };
  }

  const rows = items.map((it, i) => {
    const targetDate = it.targetDate && it.targetDate.trim() ? it.targetDate : null;
    // Time and repeat only mean something on a dated reminder.
    const repeat = targetDate ? normalizeRepeat(it.repeat) : null;
    return {
      id: it.id,
      profile_id: profileId,
      name: it.name.trim() || "Item",
      quantity: Math.max(1, it.quantity),
      estimated_price: it.estimatedPrice ?? "",
      category: normalizeCategory(it.category),
      checked: it.checked,
      target_date: targetDate,
      target_time: targetDate ? normalizeTime(it.targetTime) : null,
      repeat_rule: repeat,
      repeat_anchor: repeat ? it.repeatAnchor || targetDate : null,
      created_at: it.createdAt || new Date().toISOString(),
      sort_order: i,
    };
  });

  // Write first, then delete what is gone. Deleting everything before inserting meant a
  // failed insert (say, a column the database doesn't have yet) emptied the list.
  if (rows.length > 0) {
    const { error: upsertErr } = await supabase.from("to_do_items").upsert(rows, { onConflict: "id" });
    if (upsertErr) return { error: upsertErr.message };
  }

  let removeQuery = supabase.from("to_do_items").delete().eq("profile_id", profileId);
  if (rows.length > 0) removeQuery = removeQuery.not("id", "in", `(${rows.map((r) => r.id).join(",")})`);
  const { error: delErr } = await removeQuery;
  if (delErr) return { error: delErr.message };
  return {};
}

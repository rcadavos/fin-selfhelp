"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type UserPreferences, normalizeUserPreferences } from "@/lib/user-preferences";

export async function fetchUserPreferencesFromDb(): Promise<UserPreferences> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return normalizeUserPreferences(null);

  const { data, error } = await supabase
    .from("profiles")
    .select("user_preferences")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return normalizeUserPreferences(null);
  return normalizeUserPreferences(data.user_preferences);
}

export async function persistUserPreferences(prefs: UserPreferences): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const normalized = normalizeUserPreferences(prefs);

  const { error } = await supabase
    .from("profiles")
    .update({
      user_preferences: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/account/settings");
  return {};
}

/**
 * Server-side app-mode lookups. Plain module — deliberately not `"use server"`,
 * because these take a Supabase client (not serializable) and must not become
 * Server Action endpoints.
 *
 * `useAppMode()` is a client hook, so nothing on the server can use it. Cron
 * routes in particular have no session at all and must resolve the mode of each
 * ROW OWNER rather than of any acting user.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { type AppFeatureKey, isFeatureEnabledInMode } from "@/lib/constants/app-mode";
import { appModeFromPreferencesJson } from "@/lib/user-preferences";

/**
 * `profiles.id` values for which `feature` is switched off.
 *
 * One scan, normalized in JS. A SQL filter on `user_preferences->>'appMode'`
 * would miss every row whose column is NULL or `{}` — i.e. most accounts — and a
 * chunked `.in(ids)` risks PostgREST URL length limits.
 *
 * Returns `error` rather than throwing, and callers must fail CLOSED on it: an
 * empty set means "nobody has this switched off", which for the auto-debit cron
 * would mean debiting accounts the user has explicitly turned off.
 */
export async function fetchProfileIdsWithFeatureOff(
  supabase: SupabaseClient,
  feature: AppFeatureKey,
): Promise<{ ids: Set<string>; error?: string }> {
  const ids = new Set<string>();
  const { data, error } = await supabase.from("profiles").select("id, user_preferences");
  if (error) return { ids, error: error.message };
  for (const row of data ?? []) {
    const mode = appModeFromPreferencesJson(row.user_preferences);
    if (!isFeatureEnabledInMode(mode, feature)) ids.add(String(row.id));
  }
  return { ids };
}

import { supabase } from "@/lib/supabase";

let cached: { userId: string; profileId: Promise<string | null> } | null = null;

/**
 * The signed-in user's `profiles.id`. Per-user tables are keyed by profile, not by the
 * auth user id. Cached per user so parallel loaders share one lookup.
 */
export async function getProfileId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Not logged in.");

  if (cached?.userId !== userId) {
    cached = { userId, profileId: fetchProfileId(userId) };
  }
  try {
    return await cached.profileId;
  } catch (error) {
    cached = null;
    throw error;
  }
}

async function fetchProfileId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? String(data.id) : null;
}

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * The signed-in user, if they are an admin. `is_admin` is read with the service
 * role so RLS can't hide it. For server actions and admin route handlers.
 */
export async function requireAdminUser(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not logged in." };
  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: "Forbidden." };
  return { ok: true, userId: user.id };
}

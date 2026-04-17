"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function getIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  try {
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    return Boolean(profile?.is_admin);
  } catch (err) {
    console.error("[getIsAdmin] error (check SUPABASE_SERVICE_ROLE_KEY):", err);
    return false;
  }
}

/** For admin layout: returns whether access is allowed and where to redirect if not. Uses service role to read is_admin so RLS cannot block it. */
export async function getAdminGuard(): Promise<{ allowed: boolean; redirectTo: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, redirectTo: "/login?next=/admin" };
  try {
    const admin = createServiceRoleClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[getAdminGuard] profile fetch error:", error.message);
      return { allowed: false, redirectTo: "/dashboard" };
    }
    if (!profile) return { allowed: false, redirectTo: "/dashboard" };
    if (!profile.is_admin) return { allowed: false, redirectTo: "/dashboard" };
    return { allowed: true, redirectTo: null };
  } catch (err) {
    console.error("[getAdminGuard] error (check SUPABASE_SERVICE_ROLE_KEY and profiles.is_admin):", err);
    return { allowed: false, redirectTo: "/dashboard" };
  }
}

export type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  last_login_at: string | null;
  is_subscriber: boolean;
  subscription_ends_at: string | null;
  subscription_tier: string;
  is_admin: boolean;
};

export async function getUsersForAdmin(): Promise<{ users: AdminUserRow[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_users_for_admin");
  if (error) return { users: [], error: error.message };
  const users = (data ?? []).map((row: {
    id: string;
    email: string | null;
    created_at: string;
    last_login_at: string | null;
    is_subscriber: boolean;
    subscription_ends_at: string | null;
    subscription_tier: string | null;
    is_admin: boolean;
  }) => ({
    id: row.id,
    email: row.email ?? null,
    created_at: row.created_at,
    last_login_at: row.last_login_at ?? null,
    is_subscriber: Boolean(row.is_subscriber),
    subscription_ends_at: row.subscription_ends_at ?? null,
    subscription_tier: row.subscription_tier ?? "free",
    is_admin: Boolean(row.is_admin),
  }));
  return { users };
}

export async function setUserAdmin(
  userId: string,
  isAdmin: boolean
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in." };
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { error: "Forbidden." };
    const { error } = await supabase.rpc("set_user_admin", {
      target_user_id: userId,
      p_is_admin: isAdmin,
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update admin." };
  }
}

export type SubscriptionTier = "free" | "pro" | "premium";

export async function setUserSubscription(
  userId: string,
  tier: SubscriptionTier,
  expiresAt?: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in." };
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { error: "Forbidden." };
    const { error } = await supabase.rpc("update_user_subscription", {
      target_user_id: userId,
      p_tier: tier,
      p_expires_at: expiresAt?.trim() || null,
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update subscription." };
  }
}

export async function confirmUserEmail(userId: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in." };

    const admin = createServiceRoleClient();
    const { data: profile } = await admin.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
    if (!profile?.is_admin) return { error: "Forbidden." };

    const { error } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (error) return { error: error.message };

    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to confirm user email." };
  }
}

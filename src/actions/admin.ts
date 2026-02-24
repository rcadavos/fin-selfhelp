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
  } catch {
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
    if (error || !profile) return { allowed: false, redirectTo: "/dashboard" };
    if (!profile.is_admin) return { allowed: false, redirectTo: "/dashboard" };
    return { allowed: true, redirectTo: null };
  } catch {
    return { allowed: false, redirectTo: "/dashboard" };
  }
}

export type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  is_subscriber: boolean;
  subscription_ends_at: string | null;
};

export async function getUsersForAdmin(): Promise<{ users: AdminUserRow[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_users_for_admin");
  if (error) return { users: [], error: error.message };
  const users = (data ?? []).map((row: {
    id: string;
    email: string | null;
    created_at: string;
    is_subscriber: boolean;
    subscription_ends_at: string | null;
  }) => ({
    id: row.id,
    email: row.email ?? null,
    created_at: row.created_at,
    is_subscriber: Boolean(row.is_subscriber),
    subscription_ends_at: row.subscription_ends_at ?? null,
  }));
  return { users };
}

export async function setUserSubscription(
  userId: string,
  tier: "free" | "paid",
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
    // Call RPC with anon client so auth.uid() is set and the RPC's admin check passes
    const { error } = await supabase.rpc("update_user_subscription", {
      target_user_id: userId,
      p_is_subscriber: tier === "paid",
      p_subscription_ends_at: tier === "paid" && expiresAt ? expiresAt : null,
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update subscription." };
  }
}

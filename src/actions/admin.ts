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
  full_name: string | null;
  created_at: string;
  email_confirmed_at: string | null;
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
    full_name: string | null;
    created_at: string;
    email_confirmed_at: string | null;
    last_login_at: string | null;
    is_subscriber: boolean;
    subscription_ends_at: string | null;
    subscription_tier: string | null;
    is_admin: boolean;
  }) => ({
    id: row.id,
    email: row.email ?? null,
    full_name: row.full_name ?? null,
    created_at: row.created_at,
    email_confirmed_at: row.email_confirmed_at ?? null,
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

    if (tier === "pro" || tier === "premium") {
      const effectiveExpiry = expiresAt?.trim()
        ? new Date(expiresAt.trim())
        : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; })();
      const expiryLabel = effectiveExpiry.toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      const tierLabel = tier === "premium" ? "Premium" : "Pro";
      const dedupeKey = `sub:grant:${userId}:${tier}:${effectiveExpiry.toISOString().slice(0, 10)}`;
      await admin.rpc("insert_user_notifications_bulk", {
        notifications: [{
          user_id: userId,
          title: `${tierLabel} subscription activated`,
          body: `Your ${tierLabel} plan is now active until ${expiryLabel}. Enjoy all ${tierLabel} features!`,
          kind: "system",
          dedupe_key: dedupeKey,
        }],
      });
    }

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

export async function sendAdminNotification(params: {
  target: "all" | "subscribers" | "specific";
  userIds?: string[];
  title: string;
  body: string;
}): Promise<{ sent: number; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { sent: 0, error: "Not logged in." };

    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { sent: 0, error: "Forbidden." };

    const title = params.title.trim();
    const body = params.body.trim();
    if (!title) return { sent: 0, error: "Title is required." };

    let targetUserIds: string[] = [];

    if (params.target === "specific") {
      targetUserIds = (params.userIds ?? []).filter(Boolean);
    } else {
      const { data: profiles, error: profilesError } = await admin
        .from("profiles")
        .select("user_id, is_subscriber, subscription_tier, subscription_ends_at");
      if (profilesError) return { sent: 0, error: profilesError.message };

      const now = new Date();
      targetUserIds = (profiles ?? [])
        .filter((p) => {
          if (params.target === "all") return true;
          if (p.is_subscriber) return true;
          if (p.subscription_tier === "pro" || p.subscription_tier === "premium") {
            const endsAt = p.subscription_ends_at ? new Date(p.subscription_ends_at as string) : null;
            return endsAt != null && endsAt > now;
          }
          return false;
        })
        .map((p) => p.user_id as string)
        .filter(Boolean);
    }

    if (targetUserIds.length === 0) return { sent: 0, error: "No target users found." };

    const broadcastId = crypto.randomUUID();
    const notifications = targetUserIds.map((userId) => ({
      user_id: userId,
      title,
      body,
      kind: "system",
      dedupe_key: `admin:${broadcastId}:${userId}`,
    }));

    const batchSize = 500;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const { error: insertError } = await admin.rpc("insert_user_notifications_bulk", {
        notifications: notifications.slice(i, i + batchSize),
      });
      if (insertError) return { sent: 0, error: insertError.message };
    }

    return { sent: notifications.length };
  } catch (e) {
    return { sent: 0, error: e instanceof Error ? e.message : "Failed to send notification." };
  }
}

/** Admin: permanently delete a user and all their data. Cannot delete yourself. */
export async function deleteUser(userId: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not logged in." };
    if (user.id === userId) return { error: "You cannot delete your own account." };

    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { error: "Forbidden." };

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { error: error.message };

    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete user." };
  }
}

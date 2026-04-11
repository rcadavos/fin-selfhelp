"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AccountShareRow = {
  id: string;
  grantor_profile_id: string;
  grantee_user_id: string | null;
  invite_email: string;
  status: "pending" | "accepted" | "revoked";
  can_view_expenses: boolean;
  can_view_to_buy: boolean;
  can_view_net_worth: boolean;
  invite_token: string;
  created_at: string;
  accepted_at: string | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function listOutgoingShares(): Promise<{ error?: string; shares?: AccountShareRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Profile not found." };

  const { data, error } = await supabase
    .from("account_shares")
    .select(
      "id, grantor_profile_id, grantee_user_id, invite_email, status, can_view_expenses, can_view_to_buy, can_view_net_worth, invite_token, created_at, accepted_at"
    )
    .eq("grantor_profile_id", profile.id)
    .in("status", ["pending", "accepted", "revoked"])
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { shares: (data ?? []) as AccountShareRow[] };
}

export async function listIncomingShares(): Promise<{ error?: string; shares?: AccountShareRow[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data, error } = await supabase
    .from("account_shares")
    .select(
      "id, grantor_profile_id, grantee_user_id, invite_email, status, can_view_expenses, can_view_to_buy, can_view_net_worth, invite_token, created_at, accepted_at"
    )
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { shares: (data ?? []) as AccountShareRow[] };
}

export type AcceptedShareWithGrantorRow = {
  share: AccountShareRow;
  grantorUserId: string;
  /** Display name from auth metadata, or null if unset. */
  grantorDisplayName: string | null;
  grantorEmail: string | null;
};

function parseGrantorDisplayRpc(data: unknown): { ok?: boolean; name?: string | null; email?: string | null } | null {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as { ok?: boolean; name?: string | null; email?: string | null };
    } catch {
      return null;
    }
  }
  if (typeof data === "object" && !Array.isArray(data)) {
    return data as { ok?: boolean; name?: string | null; email?: string | null };
  }
  return null;
}

export async function listAcceptedSharesWithGrantors(): Promise<
  { error?: string; rows?: AcceptedShareWithGrantorRow[] }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: shares, error } = await supabase
    .from("account_shares")
    .select(
      "id, grantor_profile_id, grantee_user_id, invite_email, status, can_view_expenses, can_view_to_buy, can_view_net_worth, invite_token, created_at, accepted_at"
    )
    .eq("grantee_user_id", user.id)
    .eq("status", "accepted");

  if (error) return { error: error.message };

  const rows: AcceptedShareWithGrantorRow[] = [];
  for (const s of (shares ?? []) as AccountShareRow[]) {
    const { data: prof } = await supabase.from("profiles").select("user_id").eq("id", s.grantor_profile_id).single();
    if (!prof?.user_id) continue;

    const grantorUserId = prof.user_id as string;
    let grantorDisplayName: string | null = null;
    let grantorEmail: string | null = null;

    const { data: rpcData, error: rpcErr } = await supabase.rpc("grantee_grantor_display", {
      p_grantor_user_id: grantorUserId,
    });
    if (!rpcErr) {
      const parsed = parseGrantorDisplayRpc(rpcData);
      if (parsed?.ok) {
        const n = typeof parsed.name === "string" ? parsed.name.trim() : "";
        grantorEmail = typeof parsed.email === "string" ? parsed.email : null;
        grantorDisplayName = n.length > 0 ? n : null;
      }
    }

    rows.push({
      share: s,
      grantorUserId,
      grantorDisplayName,
      grantorEmail,
    });
  }
  return { rows };
}

export async function createAccountShare(input: {
  inviteEmail: string;
  canViewExpenses: boolean;
  canViewToBuy: boolean;
  /** @deprecated Net worth sharing removed; always stored as false. */
  canViewNetWorth?: boolean;
}): Promise<{ error?: string; share?: AccountShareRow }> {
  const email = normalizeEmail(input.inviteEmail);
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };
  if (!input.canViewExpenses && !input.canViewToBuy) {
    return { error: "Select at least one area to share." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };
  if (email === normalizeEmail(user.email ?? "")) {
    return { error: "You cannot invite your own email." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Profile not found." };

  const { data: inserted, error } = await supabase
    .from("account_shares")
    .insert({
      grantor_profile_id: profile.id,
      invite_email: email,
      status: "pending",
      can_view_expenses: input.canViewExpenses,
      can_view_to_buy: input.canViewToBuy,
      can_view_net_worth: false,
    })
    .select(
      "id, grantor_profile_id, grantee_user_id, invite_email, status, can_view_expenses, can_view_to_buy, can_view_net_worth, invite_token, created_at, accepted_at"
    )
    .single();

  if (error) {
    if (error.code === "23505") return { error: "You already have a pending invite for this email." };
    return { error: error.message };
  }

  revalidatePath("/account/settings/sharing");
  revalidatePath("/account/shared");
  return { share: inserted as AccountShareRow };
}

export async function updateAccountSharePermissions(
  shareId: string,
  patch: {
    canViewExpenses?: boolean;
    canViewToBuy?: boolean;
    canViewNetWorth?: boolean;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Profile not found." };

  const payload: Record<string, unknown> = {};
  if (patch.canViewExpenses !== undefined) payload.can_view_expenses = patch.canViewExpenses;
  if (patch.canViewToBuy !== undefined) payload.can_view_to_buy = patch.canViewToBuy;
  payload.can_view_net_worth = false;

  const { data: current } = await supabase
    .from("account_shares")
    .select("can_view_expenses, can_view_to_buy, can_view_net_worth")
    .eq("id", shareId)
    .eq("grantor_profile_id", profile.id)
    .single();
  if (current) {
    const ce = (payload.can_view_expenses as boolean | undefined) ?? current.can_view_expenses;
    const ct = (payload.can_view_to_buy as boolean | undefined) ?? current.can_view_to_buy;
    if (!ce && !ct) {
      return { error: "At least one area must remain shared." };
    }
  }

  const { error } = await supabase
    .from("account_shares")
    .update(payload)
    .eq("id", shareId)
    .eq("grantor_profile_id", profile.id)
    .in("status", ["pending", "accepted"]);

  if (error) return { error: error.message };
  revalidatePath("/account/settings/sharing");
  revalidatePath("/account/shared");
  return {};
}

export async function revokeAccountShare(shareId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Profile not found." };

  const { error } = await supabase
    .from("account_shares")
    .update({ status: "revoked" })
    .eq("id", shareId)
    .eq("grantor_profile_id", profile.id)
    .in("status", ["pending", "accepted"]);

  if (error) return { error: error.message };
  revalidatePath("/account/settings/sharing");
  revalidatePath("/account/shared");
  return {};
}

export async function deletePendingInvite(shareId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Profile not found." };

  const { error } = await supabase
    .from("account_shares")
    .delete()
    .eq("id", shareId)
    .eq("grantor_profile_id", profile.id)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidatePath("/account/settings/sharing");
  return {};
}

export async function acceptAccountShare(shareId: string, token: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_account_share", {
    p_share_id: shareId,
    p_token: token,
  });
  if (error) return { error: error.message };
  let result = data as { ok?: boolean; error?: string } | null;
  if (typeof data === "string") {
    try {
      result = JSON.parse(data) as { ok?: boolean; error?: string };
    } catch {
      result = null;
    }
  }
  if (!result?.ok) return { error: result?.error ?? "Could not accept invite." };
  revalidatePath("/account/settings/sharing");
  revalidatePath("/account/shared");
  return {};
}

export async function getShareForGrantor(shareId: string): Promise<{ error?: string; share?: AccountShareRow }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (profileError) return { error: profileError.message };
  if (!profile) return { error: "Profile not found." };

  const { data, error } = await supabase
    .from("account_shares")
    .select(
      "id, grantor_profile_id, grantee_user_id, invite_email, status, can_view_expenses, can_view_to_buy, can_view_net_worth, invite_token, created_at, accepted_at"
    )
    .eq("id", shareId)
    .eq("grantor_profile_id", profile.id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Invite not found." };
  return { share: data as AccountShareRow };
}

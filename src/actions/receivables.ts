"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { sendReceivableInviteEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/seo";

export type ReceivableCategory =
  | "loan"
  | "bill"
  | "food"
  | "transport"
  | "services"
  | "other";

export type ReceivableRow = {
  id: string;
  profile_id: string;
  debtor_name: string;
  amount: number;
  paid_amount: number;
  description: string;
  category: ReceivableCategory;
  borrowed_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ReceivableLinkRow = {
  id: string;
  receivable_id: string;
  owner_profile_id: string;
  debtor_email: string;
  debtor_user_id: string | null;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
  invite_token: string;
  notes: string | null;
  invited_at: string;
  confirmed_at: string | null;
};

export type ReceivableLinkPreview = {
  link_id: string;
  status: string;
  debtor_email: string;
  notes: string | null;
  receivable_id: string;
  debtor_name: string;
  description: string;
  amount: number;
  category: string;
  owner_name: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();
  return { user, profile };
}

// ─── Receivables CRUD ─────────────────────────────────────────────────────────

export async function loadReceivables(): Promise<{
  receivables: ReceivableRow[];
  links: ReceivableLinkRow[];
  error?: string;
}> {
  const supabase = await createClient();
  const { profile } = await getProfile(supabase);
  if (!profile) return { receivables: [], links: [], error: "Not logged in." };

  const [recResult, linkResult] = await Promise.all([
    supabase
      .from("receivables")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("receivable_links")
      .select("*")
      .eq("owner_profile_id", profile.id)
      .not("status", "eq", "cancelled"),
  ]);

  if (recResult.error) return { receivables: [], links: [], error: recResult.error.message };

  return {
    receivables: (recResult.data ?? []) as ReceivableRow[],
    links: (linkResult.data ?? []) as ReceivableLinkRow[],
  };
}

export async function addReceivable(input: {
  debtorName: string;
  amount: number;
  description: string;
  category: ReceivableCategory;
  borrowedDate?: string;
  dueDate?: string;
  notes?: string;
}): Promise<{ error?: string; receivable?: ReceivableRow }> {
  const supabase = await createClient();
  const { profile } = await getProfile(supabase);
  if (!profile) return { error: "Not logged in." };

  const { data, error } = await supabase
    .from("receivables")
    .insert({
      profile_id:    profile.id,
      debtor_name:   input.debtorName.trim(),
      amount:        input.amount,
      paid_amount:   0,
      description:   input.description.trim(),
      category:      input.category,
      borrowed_date: input.borrowedDate || null,
      due_date:      input.dueDate || null,
      notes:         input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { receivable: data as ReceivableRow };
}

export async function updateReceivable(
  id: string,
  input: {
    debtorName: string;
    amount: number;
    paidAmount: number;
    description: string;
    category: ReceivableCategory;
    borrowedDate?: string;
    dueDate?: string;
    notes?: string;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { profile } = await getProfile(supabase);
  if (!profile) return { error: "Not logged in." };

  const { error } = await supabase
    .from("receivables")
    .update({
      debtor_name:   input.debtorName.trim(),
      amount:        input.amount,
      paid_amount:   Math.min(input.paidAmount, input.amount),
      description:   input.description.trim(),
      category:      input.category,
      borrowed_date: input.borrowedDate || null,
      due_date:      input.dueDate || null,
      notes:         input.notes?.trim() || null,
    })
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  return {};
}

export async function markReceivableFullyPaid(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { profile } = await getProfile(supabase);
  if (!profile) return { error: "Not logged in." };

  const { data: rec } = await supabase
    .from("receivables")
    .select("amount")
    .eq("id", id)
    .eq("profile_id", profile.id)
    .single();
  if (!rec) return { error: "Not found." };

  const { error } = await supabase
    .from("receivables")
    .update({ paid_amount: rec.amount })
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  return {};
}

export async function markReceivableUnpaid(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { profile } = await getProfile(supabase);
  if (!profile) return { error: "Not logged in." };

  const { error } = await supabase
    .from("receivables")
    .update({ paid_amount: 0 })
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  return {};
}

export async function deleteReceivable(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { profile } = await getProfile(supabase);
  if (!profile) return { error: "Not logged in." };

  const { error } = await supabase
    .from("receivables")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);

  if (error) return { error: error.message };
  return {};
}

// ─── Link actions ─────────────────────────────────────────────────────────────

export async function inviteDebtorToReceivable(input: {
  receivableId: string;
  debtorEmail: string;
  notes?: string;
  ownerName?: string;
}): Promise<{ error?: string; link?: ReceivableLinkRow }> {
  const email = input.debtorEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { user, profile } = await getProfile(supabase);
  if (!user || !profile) return { error: "Not logged in." };
  if (email === (user.email ?? "").toLowerCase()) return { error: "You cannot invite yourself." };

  const { data: rec } = await supabase
    .from("receivables")
    .select("id, debtor_name, amount, description")
    .eq("id", input.receivableId)
    .eq("profile_id", profile.id)
    .single();
  if (!rec) return { error: "Receivable not found." };

  // Remove any prior cancelled/rejected link so unique constraint allows re-invite
  await supabase
    .from("receivable_links")
    .delete()
    .eq("receivable_id", input.receivableId)
    .in("status", ["cancelled", "rejected"]);

  const { data: link, error } = await supabase
    .from("receivable_links")
    .insert({
      receivable_id:    input.receivableId,
      owner_profile_id: profile.id,
      debtor_email:     email,
      notes:            input.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "An invitation for this item already exists." };
    return { error: error.message };
  }

  const typedLink = link as ReceivableLinkRow;
  const token     = typedLink.invite_token;
  const inviteUrl = `${getBaseUrl()}/dashboard/receivables/invite/${token}`;
  const r         = rec as { debtor_name: string; amount: number; description: string };
  const ownerName = input.ownerName ?? "Someone";

  // Check if the debtor email belongs to an existing OmniTrak account.
  // Use service role so we can query auth.users by email.
  const service = createServiceRoleClient();
  const { data: debtorUsers } = await service.auth.admin.listUsers();
  const debtorUser = (debtorUsers?.users ?? []).find(
    (u) => u.email?.toLowerCase() === email
  );

  if (debtorUser) {
    // Existing user — send an in-app notification instead of email
    const amountFormatted = r.amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    await service.from("user_notifications").insert({
      user_id:    debtorUser.id,
      title:      `${ownerName} says you owe them money`,
      body:       `They recorded a receivable of ${amountFormatted} for: "${r.description}". Go to your Receivables page to confirm or decline.`,
      kind:       "receivable_invite",
      dedupe_key: `receivable_link:${typedLink.id}`,
    });
  } else {
    // Unknown email — send the invite email
    await sendReceivableInviteEmail({
      to:          email,
      ownerName,
      debtorName:  r.debtor_name,
      description: r.description,
      amount:      r.amount,
      inviteUrl,
      notes:       input.notes,
    });
  }

  return { link: typedLink };
}

export async function cancelReceivableLink(linkId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { profile } = await getProfile(supabase);
  if (!profile) return { error: "Not logged in." };

  const { error } = await supabase
    .from("receivable_links")
    .update({ status: "cancelled" })
    .eq("id", linkId)
    .eq("owner_profile_id", profile.id)
    .eq("status", "pending");

  if (error) return { error: error.message };
  return {};
}

export async function confirmReceivableLinkByToken(token: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_receivable_link", { p_token: token });
  if (error) return { error: error.message };
  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { error: result?.error ?? "Could not confirm." };
  return {};
}

export async function rejectReceivableLinkByToken(token: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reject_receivable_link", { p_token: token });
  if (error) return { error: error.message };
  const result = data as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { error: result?.error ?? "Could not reject." };
  return {};
}

export async function getReceivableLinkByToken(
  token: string
): Promise<{ error?: string; preview?: ReceivableLinkPreview }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_receivable_link_by_token", { p_token: token });
  if (error) return { error: error.message };
  const result = data as ({ ok?: boolean; error?: string } & ReceivableLinkPreview) | null;
  if (!result?.ok) return { error: result?.error ?? "Invite not found." };
  return { preview: result as ReceivableLinkPreview };
}

export async function loadPendingLinksForDebtor(): Promise<{
  links: (ReceivableLinkRow & { debtor_name: string; description: string; amount: number; owner_name: string })[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { links: [] };

  const { data, error } = await supabase
    .from("receivable_links")
    .select(`*, receivables!receivable_id ( debtor_name, description, amount )`)
    .in("status", ["pending", "confirmed"])
    .or(`debtor_user_id.eq.${user.id},debtor_email.eq.${user.email}`);

  if (error) return { links: [], error: error.message };

  const rows = (data ?? []) as Array<
    ReceivableLinkRow & {
      receivables: { debtor_name: string; description: string; amount: number } | null;
    }
  >;

  return {
    links: rows.map((r) => ({
      ...r,
      debtor_name:  r.receivables?.debtor_name ?? "—",
      description:  r.receivables?.description ?? "—",
      amount:       r.receivables?.amount ?? 0,
      owner_name:   "Someone",
    })),
  };
}

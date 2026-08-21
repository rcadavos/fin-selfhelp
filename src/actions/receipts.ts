"use server";

import { createClient } from "@/lib/supabase/server";

export type SubscriptionPaymentRow = {
  id: string;
  amountCents: number;
  currency: string;
  description: string | null;
  paymentIntentId: string | null;
  paidAt: string;
  createdAt: string;
};

/** Get current user's payment history for receipts. */
export async function getMyPaymentHistory(): Promise<{
  payments: SubscriptionPaymentRow[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { payments: [], error: "Not logged in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { payments: [] };
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("id, amount_cents, currency, description, payment_intent_id, paid_at, created_at")
    .eq("profile_id", profile.id)
    .order("paid_at", { ascending: false });
  if (error) return { payments: [], error: error.message };
  const payments: SubscriptionPaymentRow[] = (data ?? []).map((row) => ({
    id: row.id,
    amountCents: Number(row.amount_cents),
    currency: row.currency ?? "PHP",
    description: row.description ?? null,
    paymentIntentId: row.payment_intent_id ?? null,
    paidAt: row.paid_at ?? row.created_at ?? "",
    createdAt: row.created_at ?? "",
  }));
  return { payments };
}

/** Get a single payment by id for receipt view. Must belong to current user. */
export async function getPaymentReceiptById(
  paymentId: string
): Promise<{ payment: SubscriptionPaymentRow | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { payment: null, error: "Not logged in." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { payment: null };
  const { data, error } = await supabase
    .from("subscription_payments")
    .select("id, amount_cents, currency, description, payment_intent_id, paid_at, created_at")
    .eq("id", paymentId)
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (error) return { payment: null, error: error.message };
  if (!data) return { payment: null };
  return {
    payment: {
      id: data.id,
      amountCents: Number(data.amount_cents),
      currency: data.currency ?? "PHP",
      description: data.description ?? null,
      paymentIntentId: data.payment_intent_id ?? null,
      paidAt: data.paid_at ?? data.created_at ?? "",
      createdAt: data.created_at ?? "",
    },
  };
}

"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SubscriptionPlanRow = {
  id: string;
  name: string;
  priceAmount: number;
  priceCurrency: string;
  interval: string;
  originalPriceAmount: number | null;
};

/** Returns the subscription plan for the app (payment page, landing, subscription page). */
export async function getSubscriptionPlan(): Promise<SubscriptionPlanRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_plan")
    .select("id, name, price_amount, price_currency, interval, original_price_amount")
    .eq("id", "default")
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    priceAmount: Number(data.price_amount),
    priceCurrency: data.price_currency ?? "USD",
    interval: data.interval ?? "month",
    originalPriceAmount: data.original_price_amount != null ? Number(data.original_price_amount) : null,
  };
}

/** Admin: get plan (same shape). */
export async function getSubscriptionPlanForAdmin(): Promise<{
  plan: SubscriptionPlanRow | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { plan: null, error: "Not logged in." };
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { plan: null, error: "Forbidden." };
    const plan = await getSubscriptionPlan();
    return { plan };
  } catch (e) {
    return { plan: null, error: e instanceof Error ? e.message : "Failed to load plan." };
  }
}

/** Admin: update subscription plan. */
export async function updateSubscriptionPlan(params: {
  name?: string;
  priceAmount?: number;
  priceCurrency?: string;
  interval?: string;
  originalPriceAmount?: number | null;
}): Promise<{ error?: string }> {
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
    const updates: Record<string, unknown> = {};
    if (params.name !== undefined) updates.name = params.name.trim();
    if (params.priceAmount !== undefined) updates.price_amount = params.priceAmount;
    if (params.priceCurrency !== undefined) updates.price_currency = params.priceCurrency.trim();
    if (params.interval !== undefined) updates.interval = params.interval.trim();
    if (params.originalPriceAmount !== undefined) updates.original_price_amount = params.originalPriceAmount;
    if (Object.keys(updates).length === 0) return {};
    const { error } = await supabase
      .from("subscription_plan")
      .update(updates)
      .eq("id", "default");
    if (error) return { error: error.message };
    revalidatePath("/admin/pricing");
    revalidatePath("/account/subscription/payment");
    revalidatePath("/account/subscription");
    revalidatePath("/");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update plan." };
  }
}

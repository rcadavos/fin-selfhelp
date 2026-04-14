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

type PlanDbRow = {
  id: string;
  name: string;
  price_amount: number | string;
  price_currency: string | null;
  interval: string | null;
  original_price_amount: number | string | null;
};

function mapPlanRow(data: PlanDbRow): SubscriptionPlanRow {
  return {
    id: data.id,
    name: data.name,
    priceAmount: Number(data.price_amount),
    priceCurrency: data.price_currency ?? "USD",
    interval: data.interval ?? "month",
    originalPriceAmount: data.original_price_amount != null ? Number(data.original_price_amount) : null,
  };
}

async function fetchPlanById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<SubscriptionPlanRow | null> {
  const { data, error } = await supabase
    .from("subscription_plan")
    .select("id, name, price_amount, price_currency, interval, original_price_amount")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapPlanRow(data as PlanDbRow);
}

/** Primary paid tier (Pro). Tries `pro` then legacy `default` row id. */
export async function getSubscriptionPlan(): Promise<SubscriptionPlanRow | null> {
  const supabase = await createClient();
  return (await fetchPlanById(supabase, "pro")) ?? (await fetchPlanById(supabase, "default"));
}

export async function getSubscriptionPlans(): Promise<{
  pro: SubscriptionPlanRow | null;
  premium: SubscriptionPlanRow | null;
}> {
  const supabase = await createClient();
  const [pro, premium] = await Promise.all([
    fetchPlanById(supabase, "pro").then((p) => p ?? fetchPlanById(supabase, "default")),
    fetchPlanById(supabase, "premium"),
  ]);
  return { pro, premium };
}

/** Admin: load Pro + Premium pricing rows. */
export async function getSubscriptionPlansForAdmin(): Promise<{
  plans: { pro: SubscriptionPlanRow | null; premium: SubscriptionPlanRow | null };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { plans: { pro: null, premium: null }, error: "Not logged in." };
    const admin = createServiceRoleClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile?.is_admin) return { plans: { pro: null, premium: null }, error: "Forbidden." };
    const plans = await getSubscriptionPlans();
    return { plans };
  } catch (e) {
    return { plans: { pro: null, premium: null }, error: e instanceof Error ? e.message : "Failed to load plans." };
  }
}

/** @deprecated Use getSubscriptionPlansForAdmin */
export async function getSubscriptionPlanForAdmin(): Promise<{
  plan: SubscriptionPlanRow | null;
  error?: string;
}> {
  const { plans, error } = await getSubscriptionPlansForAdmin();
  return { plan: plans.pro, error };
}

/** Admin: update one plan row by id (`pro` or `premium`). */
export async function updateSubscriptionPlanById(
  planId: "pro" | "premium",
  params: {
    name?: string;
    priceAmount?: number;
    priceCurrency?: string;
    interval?: string;
    originalPriceAmount?: number | null;
  }
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    const { error } = await supabase.from("subscription_plan").update(updates).eq("id", planId);
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

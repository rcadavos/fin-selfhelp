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
  enabled: boolean;
};

type PlanDbRow = {
  id: string;
  name: string;
  price_amount: number | string;
  price_currency: string | null;
  interval: string | null;
  original_price_amount: number | string | null;
  enabled?: boolean | null;
};

function mapPlanRow(data: PlanDbRow): SubscriptionPlanRow {
  return {
    id: data.id,
    name: data.name,
    priceAmount: Number(data.price_amount),
    priceCurrency: data.price_currency ?? "USD",
    interval: data.interval ?? "month",
    originalPriceAmount: data.original_price_amount != null ? Number(data.original_price_amount) : null,
    enabled: data.enabled ?? true,
  };
}

const PLAN_SELECT = "id, name, price_amount, price_currency, interval, original_price_amount, enabled";
const RESERVED_PLAN_IDS = new Set(["default"]);

async function fetchPlanById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<SubscriptionPlanRow | null> {
  const { data, error } = await supabase
    .from("subscription_plan")
    .select(PLAN_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapPlanRow(data as PlanDbRow);
}

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
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
  return { ok: true };
}

/** Primary paid tier (Pro). Tries `pro` then legacy `default` row id. */
export async function getSubscriptionPlan(): Promise<SubscriptionPlanRow | null> {
  const supabase = await createClient();
  return (await fetchPlanById(supabase, "pro")) ?? (await fetchPlanById(supabase, "default"));
}

export async function getSubscriptionPlans(): Promise<{
  pro: SubscriptionPlanRow | null;
  premium: SubscriptionPlanRow | null;
  extras: SubscriptionPlanRow[];
}> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("subscription_plan")
      .select(PLAN_SELECT);

    if (error || !data) {
      return { pro: null, premium: null, extras: [] };
    }

    const plans = data as PlanDbRow[];
    const proRaw = plans.find((p) => p.id === "pro") || plans.find((p) => p.id === "default");
    const premiumRaw = plans.find((p) => p.id === "premium");
    const extras = plans
      .filter((p) => p.id !== "pro" && p.id !== "premium" && p.id !== "default")
      .map(mapPlanRow)
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      pro: proRaw ? mapPlanRow(proRaw) : null,
      premium: premiumRaw ? mapPlanRow(premiumRaw) : null,
      extras,
    };
  } catch {
    return { pro: null, premium: null, extras: [] };
  }
}

/** Admin: load all pricing rows (Pro, Premium, extras). */
export async function getSubscriptionPlansForAdmin(): Promise<{
  plans: { pro: SubscriptionPlanRow | null; premium: SubscriptionPlanRow | null; extras: SubscriptionPlanRow[] };
  error?: string;
}> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { plans: { pro: null, premium: null, extras: [] }, error: auth.error };
    const plans = await getSubscriptionPlans();
    return { plans };
  } catch (e) {
    return {
      plans: { pro: null, premium: null, extras: [] },
      error: e instanceof Error ? e.message : "Failed to load plans.",
    };
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

function revalidatePlanPages() {
  revalidatePath("/admin/pricing");
  revalidatePath("/account/subscription/payment");
  revalidatePath("/account/subscription");
  revalidatePath("/");
}

/** Admin: update one plan row by id (`pro`, `premium`, or any custom plan id). */
export async function updateSubscriptionPlanById(
  planId: string,
  params: {
    name?: string;
    priceAmount?: number;
    priceCurrency?: string;
    interval?: string;
    originalPriceAmount?: number | null;
    enabled?: boolean;
  }
): Promise<{ error?: string }> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { error: auth.error };
    const supabase = await createClient();
    const updates: Record<string, unknown> = {};
    if (params.name !== undefined) updates.name = params.name.trim();
    if (params.priceAmount !== undefined) updates.price_amount = params.priceAmount;
    if (params.priceCurrency !== undefined) updates.price_currency = params.priceCurrency.trim();
    if (params.interval !== undefined) updates.interval = params.interval.trim();
    if (params.originalPriceAmount !== undefined) updates.original_price_amount = params.originalPriceAmount;
    if (params.enabled !== undefined) updates.enabled = params.enabled;
    if (Object.keys(updates).length === 0) return {};
    const { error } = await supabase.from("subscription_plan").update(updates).eq("id", planId);
    if (error) return { error: error.message };
    revalidatePlanPages();
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update plan." };
  }
}

/** Admin: create a new plan row. */
export async function createSubscriptionPlan(params: {
  id: string;
  name: string;
  priceAmount: number;
  priceCurrency: string;
  interval: string;
  originalPriceAmount: number | null;
  enabled: boolean;
}): Promise<{ error?: string; plan?: SubscriptionPlanRow }> {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return { error: auth.error };

    const id = params.id.trim().toLowerCase().replace(/\s+/g, "-");
    const name = params.name.trim();
    if (!id) return { error: "Plan id is required." };
    if (!/^[a-z0-9_-]+$/.test(id)) return { error: "Plan id may only contain letters, numbers, dashes and underscores." };
    if (RESERVED_PLAN_IDS.has(id)) return { error: `'${id}' is a reserved id.` };
    if (!name) return { error: "Plan name is required." };

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("subscription_plan")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (existing) return { error: `A plan with id '${id}' already exists.` };

    const { data, error } = await supabase
      .from("subscription_plan")
      .insert({
        id,
        name,
        price_amount: params.priceAmount,
        price_currency: params.priceCurrency.trim() || "USD",
        interval: params.interval.trim() || "month",
        original_price_amount: params.originalPriceAmount,
        enabled: params.enabled,
      })
      .select(PLAN_SELECT)
      .maybeSingle();

    if (error) return { error: error.message };
    revalidatePlanPages();
    return { plan: data ? mapPlanRow(data as PlanDbRow) : undefined };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create plan." };
  }
}

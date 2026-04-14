"use server";

import { createClient } from "@/lib/supabase/server";
import {
  hasPremiumProductAccess,
  hasProLevelProductAccess,
  normalizeDbTier,
  type SubscriptionTierId,
} from "@/lib/subscription-tier";

export type SubscriptionCapabilities = {
  tier: SubscriptionTierId;
  hasProLevelAccess: boolean;
  hasPremiumAccess: boolean;
};

export async function getSubscriptionCapabilities(): Promise<SubscriptionCapabilities | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_ends_at, is_subscriber")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return null;
  const tier = normalizeDbTier(profile.subscription_tier as string | null);
  const ends = profile.subscription_ends_at as string | null;
  const isSub = Boolean(profile.is_subscriber);
  return {
    tier,
    hasProLevelAccess: hasProLevelProductAccess(tier, ends, isSub),
    hasPremiumAccess: hasPremiumProductAccess(tier, ends, isSub),
  };
}

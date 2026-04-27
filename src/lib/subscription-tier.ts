export type SubscriptionTierId = "free" | "pro" | "premium";

export function normalizeDbTier(raw: string | null | undefined): SubscriptionTierId {
  if (raw === "premium") return "premium";
  if (raw === "pro") return "pro";
  return "free";
}

export function hasActiveSubscriptionWindow(
  subscriptionEndsAt: string | null | undefined,
  isSubscriber: boolean
): boolean {
  const now = Date.now();
  const endsMs = subscriptionEndsAt ? new Date(subscriptionEndsAt).getTime() : NaN;
  const windowActive = !Number.isNaN(endsMs) && endsMs > now;
  return windowActive || Boolean(isSubscriber);
}

/** Due dates, reminders, unlimited to-buy / to-do (Pro or Premium while active). */
export function hasProLevelProductAccess(
  tier: SubscriptionTierId,
  subscriptionEndsAt: string | null | undefined,
  isSubscriber: boolean
): boolean {
  if (tier !== "pro" && tier !== "premium") return false;
  return hasActiveSubscriptionWindow(subscriptionEndsAt, isSubscriber);
}

/** Rent tracker, payment tracker, etc. */
export function hasPremiumProductAccess(
  tier: SubscriptionTierId,
  subscriptionEndsAt: string | null | undefined,
  isSubscriber: boolean
): boolean {
  if (tier !== "premium") return false;
  return hasActiveSubscriptionWindow(subscriptionEndsAt, isSubscriber);
}

/** Free accounts: max items per to-buy / to-do list. */
export const FREE_TIER_MAX_LIST_ITEMS = 5;

/** Free accounts: max bills that can have a reminder set. */
export const FREE_TIER_MAX_BILL_REMINDERS = 1;

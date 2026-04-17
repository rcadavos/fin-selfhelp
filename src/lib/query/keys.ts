export const queryKeys = {
  all: ["omni-trak"] as const,
  categories: () => [...queryKeys.all, "categories"] as const,
  subscriptionPlan: () => [...queryKeys.all, "subscription-plan"] as const,
  subscriptionPlans: () => [...queryKeys.all, "subscription-plans"] as const,
  approvedReviews: () => [...queryKeys.all, "approved-reviews"] as const,
  adminUsers: () => [...queryKeys.all, "admin", "users"] as const,
  /** Prefix: invalidate with `[...queryKeys.all, "expenses"]` to refresh all expense queries. */
  expenseData: (paidMonth: string) => [...queryKeys.all, "expenses", "data", paidMonth] as const,
  expensePaymentHistory: (months: number) =>
    [...queryKeys.all, "expenses", "payment-history", months] as const,
  /** Current user’s to-buy list rows (see `toBuyItemsQueryOptions`). */
  toBuyItems: () => [...queryKeys.all, "to-buy", "items"] as const,
  /** Current user’s to-do list rows (see `toDoItemsQueryOptions`). */
  toDoItems: () => [...queryKeys.all, "to-do", "items"] as const,
  /** Personal goals (see `goalsQueryOptions`). */
  goals: () => [...queryKeys.all, "goals", "items"] as const,
  /** `getIsAdmin()` — shared by header + sidebar (dedupe via one query). */
  userIsAdmin: () => [...queryKeys.all, "user", "is-admin"] as const,
  /** `fetchUserPreferencesFromDb()` — keyed by user id for account switches. */
  userPreferences: (userId: string | undefined) =>
    [...queryKeys.all, "user", "preferences", userId ?? "none"] as const,
  /** Current user’s subscription row shape from `getSubscriptionStatus` (see `subscriptionStatusQueryOptions`). */
  subscriptionStatus: () => [...queryKeys.all, "subscription", "status"] as const,
  /** Pro/Premium capability flags from `getSubscriptionCapabilities` (see `subscriptionCapabilitiesQueryOptions`). */
  subscriptionCapabilities: () => [...queryKeys.all, "subscription", "capabilities"] as const,
  /** Current user’s `subscription_payments` rows (see `subscriptionPaymentsQueryOptions`). */
  subscriptionPayments: () => [...queryKeys.all, "subscription", "payments"] as const,
  /** In-app notifications (`user_notifications` via `loadMyNotifications`). */
  notifications: () => [...queryKeys.all, "notifications"] as const,
};

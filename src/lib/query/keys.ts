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
  /** Deposits for a single goal (see `goalDepositsQueryOptions`). */
  goalDeposits: (goalId: string) => [...queryKeys.all, "goals", "deposits", goalId] as const,
  /** `getIsAdmin()` — shared by header + sidebar (dedupe via one query). */
  userIsAdmin: () => [...queryKeys.all, "user", "is-admin"] as const,
  /** `fetchUserPreferencesFromDb()` — keyed by user id for account switches. */
  userPreferences: (userId: string | undefined) =>
    [...queryKeys.all, "user", "preferences", userId ?? "none"] as const,
  /** Bills data for a paid month (see `billsDataQueryOptions`). */
  billData: (paidMonth: string) => [...queryKeys.all, "bills", "data", paidMonth] as const,
  /** Current user’s subscription row shape from `getSubscriptionStatus` (see `subscriptionStatusQueryOptions`). */
  subscriptionStatus: () => [...queryKeys.all, "subscription", "status"] as const,
  /** Pro/Premium capability flags from `getSubscriptionCapabilities` (see `subscriptionCapabilitiesQueryOptions`). */
  subscriptionCapabilities: () => [...queryKeys.all, "subscription", "capabilities"] as const,
  /** Current user’s `subscription_payments` rows (see `subscriptionPaymentsQueryOptions`). */
  subscriptionPayments: () => [...queryKeys.all, "subscription", "payments"] as const,
  /** In-app notifications (`user_notifications` via `loadMyNotifications`). */
  notifications: () => [...queryKeys.all, "notifications"] as const,
  /** User's named bank/e-wallet accounts (see `accountsQueryOptions`). */
  accounts: () => [...queryKeys.all, "accounts"] as const,
  /** Current user's daily login streak (see `userStreakQueryOptions`). */
  userStreak: () => [...queryKeys.all, "user", "streak"] as const,
  /** Current user's registered vehicles (see `vehiclesQueryOptions`). */
  vehicles: () => [...queryKeys.all, "vehicles"] as const,
  /** Monthly totals for dashboard bars (versioned to bust stale cached shapes). */
  monthlyBreakdown: (months: number) => [...queryKeys.all, "monthly-breakdown", "v2", months] as const,
  /** Current user's own custom expense categories (see `userCategoriesQueryOptions`). */
  userCategories: () => [...queryKeys.all, "user-categories"] as const,
  /** Current user's receivables + links (see `receivablesQueryOptions`). */
  receivables: () => [...queryKeys.all, "receivables"] as const,
  /** Pending receivable links where current user is the debtor (see `pendingReceivableLinksQueryOptions`). */
  pendingReceivableLinks: () => [...queryKeys.all, "receivables", "links", "pending"] as const,
};

export const queryKeys = {
  all: ["fin-selfhelp"] as const,
  categories: () => [...queryKeys.all, "categories"] as const,
  subscriptionPlan: () => [...queryKeys.all, "subscription-plan"] as const,
  approvedReviews: () => [...queryKeys.all, "approved-reviews"] as const,
  adminUsers: () => [...queryKeys.all, "admin", "users"] as const,
};

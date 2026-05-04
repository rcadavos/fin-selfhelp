/**
 * Built-in expense category id for Transport & Commute (matches `EXPENSE_CATEGORIES` in types/database.types.ts).
 * Vehicle spending rolls up transport expenses linked to a vehicle; React Query should refresh when these entries change.
 */
export const TRANSPORT_EXPENSE_CATEGORY_ID = "transport" as const;

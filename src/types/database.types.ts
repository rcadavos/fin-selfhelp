export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ExpenseCategoryKey =
  | "grocery"
  | "transport"
  | "utilities"
  | "insurance"
  | "loans"
  | "savings"
  | "rent"
  | "food_dining"
  | "health"
  | "education"
  | "personal"
  | "credit_card"
  | "other";

export type ExpenseCategory = {
  id: ExpenseCategoryKey;
  label: string;
  description?: string;
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "grocery", label: "Grocery" },
  { id: "transport", label: "Transport & commute" },
  { id: "utilities", label: "Utilities (electric, water, internet)" },
  { id: "insurance", label: "Insurance" },
  { id: "loans", label: "Loans & Debts" },
  { id: "savings", label: "Savings & Investments" },
  { id: "rent", label: "Rent / mortgage" },
  { id: "food_dining", label: "Food & dining out" },
  { id: "health", label: "Health & medical" },
  { id: "education", label: "Education" },
  { id: "personal", label: "Personal & grooming" },
  { id: "credit_card", label: "Credit card" },
  { id: "other", label: "Other" },
];

export type BudgetSummary = {
  netTakeHome: number;
  totalExpenses: number;
  balance: number;
  status: "overdraft" | "extra" | "break_even";
  byCategory: { categoryId: ExpenseCategoryKey; label: string; amount: number }[];
};

export type BudgetState = {
  netTakeHome: number;
  expenses: Record<ExpenseCategoryKey, number>;
};

export type DbProfile = {
  id: string;
  user_id: string;
  net_take_home: number;
  currency: string;
  is_subscriber?: boolean;
  subscription_ends_at?: string | null;
  created_at: string;
  updated_at: string;
};

/** Days before due date to send a reminder. 3 = 3 days before, 1 = 1 day before, 0 = on due date. */
export type ReminderDay = 3 | 1 | 0;

export const REMINDER_OPTIONS: { value: ReminderDay; label: string }[] = [
  { value: 3, label: "3 days before" },
  { value: 1, label: "1 day before" },
  { value: 0, label: "On due date" },
];

export type DbExpenseEntry = {
  id: string;
  profile_id: string;
  category_id: ExpenseCategoryKey;
  amount: number;
  note?: string;
  due_date?: string | null;
  reminder_days_before?: number[] | null;
  created_at: string;
  updated_at: string;
};

/** Free-tier users can only have this many expenses; only these count toward summary and status. */
export const FREE_TIER_EXPENSE_LIMIT = 5;

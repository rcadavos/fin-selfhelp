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
  { id: "loans", label: "Loans & debt" },
  { id: "savings", label: "Savings & investments" },
  { id: "rent", label: "Rent / mortgage" },
  { id: "food_dining", label: "Food & dining out" },
  { id: "health", label: "Health & medical" },
  { id: "education", label: "Education" },
  { id: "personal", label: "Personal & grooming" },
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
  created_at: string;
  updated_at: string;
};

export type DbExpenseEntry = {
  id: string;
  profile_id: string;
  category_id: ExpenseCategoryKey;
  amount: number;
  note?: string;
  created_at: string;
  updated_at: string;
};

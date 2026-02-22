import type {
  BudgetSummary,
  BudgetState,
  ExpenseCategoryKey,
} from "@/types/database.types";
import { EXPENSE_CATEGORIES } from "@/types/database.types";

const INITIAL_EXPENSES: Record<ExpenseCategoryKey, number> = {
  grocery: 0,
  transport: 0,
  utilities: 0,
  insurance: 0,
  loans: 0,
  savings: 0,
  rent: 0,
  food_dining: 0,
  health: 0,
  education: 0,
  personal: 0,
  other: 0,
};

export function getInitialBudgetState(): BudgetState {
  return {
    netTakeHome: 0,
    expenses: { ...INITIAL_EXPENSES },
  };
}

export function computeBudgetSummary(state: BudgetState): BudgetSummary {
  const { netTakeHome, expenses } = state;
  const totalExpenses = (Object.values(expenses) as number[]).reduce(
    (a, b) => a + b,
    0
  );
  const balance = netTakeHome - totalExpenses;
  const status: BudgetSummary["status"] =
    balance < 0 ? "overdraft" : balance > 0 ? "extra" : "break_even";

  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    categoryId: cat.id,
    label: cat.label,
    amount: expenses[cat.id] ?? 0,
  }));

  return {
    netTakeHome,
    totalExpenses,
    balance: Math.abs(balance),
    status,
    byCategory,
  };
}

import type { BudgetSummary, BudgetState } from "@/types/database.types";

export function getInitialBudgetState(): BudgetState {
  return {
    netTakeHome: 0,
    expenses: {},
  };
}

export function computeBudgetSummary(
  state: BudgetState,
  categories?: { id: string; label: string }[]
): BudgetSummary {
  const { netTakeHome, expenses } = state;
  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
  const balance = netTakeHome - totalExpenses;
  const status: BudgetSummary["status"] =
    balance < 0 ? "overdraft" : balance > 0 ? "extra" : "break_even";

  const byCategory = categories
    ? categories.map((cat) => ({
        categoryId: cat.id,
        label: cat.label,
        amount: expenses[cat.id] ?? 0,
      }))
    : (Object.entries(expenses) as [string, number][]).map(([categoryId, amount]) => ({
        categoryId,
        label: categoryId,
        amount,
      }));

  return {
    netTakeHome,
    totalExpenses,
    balance: Math.abs(balance),
    status,
    byCategory,
  };
}

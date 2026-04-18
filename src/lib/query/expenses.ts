import { queryOptions } from "@tanstack/react-query";
import { loadExpenseData, loadExpenseSummary, type ExpenseData, type DashboardSummary } from "@/actions/budget";
import { getPaymentHistoryMonths, type PaymentMonthStats } from "@/actions/expense-payments";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { queryKeys } from "./keys";

export const EXPENSE_PAYMENT_HISTORY_MONTHS = 6;

export function expenseDataQueryOptions(paidMonth?: string) {
  const month =
    paidMonth && /^\d{4}-\d{2}$/.test(paidMonth) ? paidMonth : getCurrentPaidMonth();
  return queryOptions({
    queryKey: queryKeys.expenseData(month),
    queryFn: (): Promise<ExpenseData | null> => loadExpenseData(month),
  });
}

export function expenseSummaryQueryOptions(paidMonth?: string) {
  const month =
    paidMonth && /^\d{4}-\d{2}$/.test(paidMonth) ? paidMonth : getCurrentPaidMonth();
  return queryOptions({
    queryKey: [...queryKeys.expenseData(month), "summary"],
    queryFn: (): Promise<DashboardSummary | null> => loadExpenseSummary(month),
  });
}


export function expensePaymentHistoryQueryOptions(months: number = EXPENSE_PAYMENT_HISTORY_MONTHS) {
  return queryOptions({
    queryKey: queryKeys.expensePaymentHistory(months),
    queryFn: async (): Promise<PaymentMonthStats[]> => {
      const res = await getPaymentHistoryMonths(months);
      if (res.error) throw new Error(res.error);
      return res.stats ?? [];
    },
  });
}

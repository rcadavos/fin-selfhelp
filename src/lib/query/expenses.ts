import { queryOptions } from "@tanstack/react-query";
import { loadExpenseData, loadExpenseSummary, type ExpenseData, type DashboardSummary } from "@/actions/budget";
import { getPaymentHistoryMonths, getMonthlyBreakdown, type PaymentMonthStats, type MonthlyBreakdownPoint } from "@/actions/expense-payments";
import { getCurrentPaidMonth } from "@/lib/paid-month";
import { queryKeys } from "./keys";

export const EXPENSE_PAYMENT_HISTORY_MONTHS = 6;

export function expenseDataQueryOptions(paidMonth?: string) {
  const month =
    paidMonth && /^\d{4}-\d{2}$/.test(paidMonth) ? paidMonth : getCurrentPaidMonth();
  return queryOptions({
    queryKey: queryKeys.expenseData(month),
    queryFn: () => Promise.resolve().then((): Promise<ExpenseData | null> => loadExpenseData(month)),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function expenseSummaryQueryOptions(paidMonth?: string) {
  const month =
    paidMonth && /^\d{4}-\d{2}$/.test(paidMonth) ? paidMonth : getCurrentPaidMonth();
  return queryOptions({
    queryKey: [...queryKeys.expenseData(month), "summary"],
    queryFn: () => Promise.resolve().then((): Promise<DashboardSummary | null> => loadExpenseSummary(month)),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function expensePaymentHistoryQueryOptions(months: number = EXPENSE_PAYMENT_HISTORY_MONTHS) {
  return queryOptions({
    queryKey: queryKeys.expensePaymentHistory(months),
    queryFn: () => Promise.resolve().then(async (): Promise<PaymentMonthStats[]> => {
      const res = await getPaymentHistoryMonths(months);
      if (res.error) throw new Error(res.error);
      return res.stats ?? [];
    }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function monthlyBreakdownQueryOptions(months: number = EXPENSE_PAYMENT_HISTORY_MONTHS) {
  return queryOptions({
    queryKey: queryKeys.monthlyBreakdown(months),
    queryFn: () => Promise.resolve().then(async (): Promise<MonthlyBreakdownPoint[]> => {
      const res = await getMonthlyBreakdown(months);
      if (res.error) throw new Error(res.error);
      return res.stats ?? [];
    }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Debt payoff calculator: months to payoff and total interest with fixed monthly (and optional extra) payments.
 */

export interface DebtPayoffInput {
  /** Current loan/credit balance (e.g. PHP). */
  balance: number;
  /** Annual interest rate (e.g. 12 for 12%). */
  annualInterestRatePct: number;
  /** Minimum monthly payment. */
  monthlyPayment: number;
  /** Extra amount to add each month (optional). */
  extraMonthlyPayment?: number;
}

export interface DebtPayoffResult {
  /** Number of months until balance is paid off. */
  monthsToPayoff: number;
  /** Total interest paid over the life of the loan. */
  totalInterestPaid: number;
  /** Payoff year (e.g. 2030). */
  payoffYear: number;
  /** Payoff month (1–12). */
  payoffMonth: number;
}

export function runDebtPayoffCalculation(input: DebtPayoffInput): DebtPayoffResult | null {
  const {
    balance: initialBalance,
    annualInterestRatePct,
    monthlyPayment,
    extraMonthlyPayment = 0,
  } = input;

  if (initialBalance <= 0 || monthlyPayment <= 0) return null;

  const monthlyRate = annualInterestRatePct / 100 / 12;
  const totalPayment = monthlyPayment + extraMonthlyPayment;

  let balance = initialBalance;
  let totalInterest = 0;
  let month = 0;
  const startDate = new Date();

  while (balance > 0 && month < 1200) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    const principal = Math.min(totalPayment - interest, balance);
    balance -= principal;
    month++;
  }

  if (balance > 0) return null; // payment too low, would never pay off

  const payoffDate = new Date(startDate);
  payoffDate.setMonth(payoffDate.getMonth() + month);

  return {
    monthsToPayoff: month,
    totalInterestPaid: Math.round(totalInterest * 100) / 100,
    payoffYear: payoffDate.getFullYear(),
    payoffMonth: payoffDate.getMonth() + 1,
  };
}

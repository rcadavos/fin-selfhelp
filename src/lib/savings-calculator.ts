/**
 * Savings / Investment calculator logic.
 * Philippine economy–focused defaults (BSP time deposit rates, PSA/BSP inflation).
 */

/** Default annual interest rate (e.g. PH time deposit 1–5 years ~4%). */
export const PH_DEFAULT_INTEREST_RATE_PCT = 4;

/** Default annual inflation rate (PH projected ~3%–3.5%; historical average higher). */
export const PH_DEFAULT_INFLATION_RATE_PCT = 3.5;

export interface SavingsCalculatorInput {
  /** Year when saving/investing starts (e.g. 2025). */
  startYear: number;
  /** Year when you plan to withdraw or maturity (e.g. 2035). */
  endYear: number;
  /** Initial lump sum (PHP). */
  initialAmount: number;
  /** Annual contribution (PHP), e.g. saved at end of each year. */
  annualContribution: number;
  /** Annual nominal interest rate (e.g. 4 for 4%). */
  interestRatePct: number;
  /** Annual inflation rate (e.g. 3.5 for 3.5%). */
  inflationRatePct: number;
}

export interface SavingsCalculatorResult {
  /** Number of years from start to end. */
  years: number;
  /** Future value in nominal PHP (today’s pesos). */
  futureValueNominal: number;
  /** Future value in real (inflation-adjusted) PHP. */
  futureValueReal: number;
  /** Total amount you put in (initial + contributions). */
  totalContributions: number;
  /** Interest/growth earned (nominal). */
  interestEarned: number;
  /** Real purchasing power of interest (above inflation). */
  realInterestEarned: number;
}

/**
 * Compute future value of a lump sum: FV = PV * (1 + r)^n
 */
function futureValueLumpSum(pv: number, rateDecimal: number, years: number): number {
  if (years <= 0) return pv;
  return pv * Math.pow(1 + rateDecimal, years);
}

/**
 * Future value of ordinary annuity (contributions at end of each period):
 * FV = PMT * (((1 + r)^n - 1) / r)
 */
function futureValueAnnuity(pmt: number, rateDecimal: number, years: number): number {
  if (years <= 0) return 0;
  if (Math.abs(rateDecimal) < 1e-10) return pmt * years;
  return pmt * (Math.pow(1 + rateDecimal, years) - 1) / rateDecimal;
}

/**
 * Run the savings/investment projection.
 */
export function runSavingsCalculation(input: SavingsCalculatorInput): SavingsCalculatorResult | null {
  const years = input.endYear - input.startYear;
  if (years < 0) return null;

  const r = input.interestRatePct / 100;
  const inf = input.inflationRatePct / 100;

  const fvLump = futureValueLumpSum(input.initialAmount, r, years);
  const fvAnnuity = futureValueAnnuity(input.annualContribution, r, years);
  const futureValueNominal = fvLump + fvAnnuity;

  const totalContributions = input.initialAmount + input.annualContribution * years;
  const interestEarned = futureValueNominal - totalContributions;

  const futureValueReal = years > 0
    ? futureValueNominal / Math.pow(1 + inf, years)
    : futureValueNominal;
  const realInterestEarned = futureValueReal - totalContributions;

  return {
    years,
    futureValueNominal,
    futureValueReal,
    totalContributions,
    interestEarned,
    realInterestEarned,
  };
}

export interface PhContributions {
  sssMonthly: number;
  sssAnnual: number;
  philhealthMonthly: number;
  philhealthAnnual: number;
  pagibigMonthly: number;
  pagibigAnnual: number;
  totalMonthly: number;
  totalAnnual: number;
}

export interface PhTaxResult {
  monthlyGross: number;
  annualGross: number;
  contributions: PhContributions;
  taxableIncome: number;
  annualTax: number;
  monthlyTax: number;
  effectiveTaxRatePct: number;
  marginalTaxRatePct: number;
  taxBracketLabel: string;
}

// TRAIN Law tax brackets effective 2023+
const TAX_BRACKETS = [
  { min: 0,         max: 250_000,   base: 0,         rate: 0    },
  { min: 250_000,   max: 400_000,   base: 0,         rate: 0.15 },
  { min: 400_000,   max: 800_000,   base: 22_500,    rate: 0.20 },
  { min: 800_000,   max: 2_000_000, base: 102_500,   rate: 0.25 },
  { min: 2_000_000, max: 8_000_000, base: 402_500,   rate: 0.30 },
  { min: 8_000_000, max: Infinity,  base: 2_202_500, rate: 0.35 },
];

// SSS: 4.5% of Monthly Salary Credit (₱4,000–₱30,000 MSC range)
function computeSSS(monthly: number): number {
  const msc = Math.min(30_000, Math.max(4_000, monthly));
  return Math.round(msc * 0.045);
}

// PhilHealth: employee share = 2.5% of salary, min ₱250, max ₱2,500
function computePhilHealth(monthly: number): number {
  return Math.min(2_500, Math.max(250, Math.round(monthly * 0.025)));
}

// Pag-IBIG: 1% if salary ≤ ₱1,500, else 2%, capped at ₱100/mo
function computePagibig(monthly: number): number {
  if (monthly <= 1_500) return Math.round(monthly * 0.01);
  return Math.min(100, Math.round(monthly * 0.02));
}

function computeAnnualTax(taxableIncome: number): {
  tax: number;
  marginalRatePct: number;
  bracketLabel: string;
} {
  for (const b of TAX_BRACKETS) {
    if (taxableIncome <= b.max) {
      return {
        tax: Math.max(0, b.base + (taxableIncome - b.min) * b.rate),
        marginalRatePct: b.rate * 100,
        bracketLabel: `${b.rate * 100}%`,
      };
    }
  }
  return { tax: 0, marginalRatePct: 0, bracketLabel: "0%" };
}

export function computePhTax(monthlyGross: number): PhTaxResult {
  const annualGross = monthlyGross * 12;

  const sssMonthly = computeSSS(monthlyGross);
  const philhealthMonthly = computePhilHealth(monthlyGross);
  const pagibigMonthly = computePagibig(monthlyGross);
  const totalMonthly = sssMonthly + philhealthMonthly + pagibigMonthly;

  const contributions: PhContributions = {
    sssMonthly,
    sssAnnual: sssMonthly * 12,
    philhealthMonthly,
    philhealthAnnual: philhealthMonthly * 12,
    pagibigMonthly,
    pagibigAnnual: pagibigMonthly * 12,
    totalMonthly,
    totalAnnual: totalMonthly * 12,
  };

  // Contributions are pre-tax deductions under Philippine law
  const taxableIncome = Math.max(0, annualGross - contributions.totalAnnual);
  const { tax: annualTax, marginalRatePct, bracketLabel } = computeAnnualTax(taxableIncome);

  return {
    monthlyGross,
    annualGross,
    contributions,
    taxableIncome,
    annualTax,
    monthlyTax: annualTax / 12,
    effectiveTaxRatePct: annualGross > 0 ? (annualTax / annualGross) * 100 : 0,
    marginalTaxRatePct: marginalRatePct,
    taxBracketLabel: bracketLabel,
  };
}

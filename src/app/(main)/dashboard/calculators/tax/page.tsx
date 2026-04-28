"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { useUser } from "@/hooks/use-user";
import { formatCurrency } from "@/lib/utils";
import { computePhTax } from "@/lib/ph-tax-calculator";
import { ChevronLeft, Receipt, Shield, Landmark } from "lucide-react";

export default function TaxCalculatorPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  const [monthlyGross, setMonthlyGross] = useState("");
  const [deductTax, setDeductTax] = useState(true);
  const [deductContributions, setDeductContributions] = useState(true);

  const result = useMemo(() => {
    const gross = parseFloat(monthlyGross.replace(/,/g, "")) || 0;
    if (gross <= 0) return null;
    return computePhTax(gross);
  }, [monthlyGross]);

  if (loading || !user) {
    if (!loading && !user) router.replace("/login");
    return <DashboardSkeleton variant="page" />;
  }

  const netAnnual = result
    ? result.annualGross
      - (deductTax ? result.annualTax : 0)
      - (deductContributions ? result.contributions.totalAnnual : 0)
    : 0;
  const netMonthly = netAnnual / 12;

  const netDescription = () => {
    if (deductTax && deductContributions) return "After income tax and mandatory contributions.";
    if (deductTax) return "After income tax only. Contributions not deducted.";
    if (deductContributions) return "After contributions only. Tax not deducted.";
    return "No deductions applied — showing gross income.";
  };

  return (
    <div className="container mx-auto w-full min-w-0 max-w-4xl px-4 pb-8 pt-4">
      <div className="mb-6">
        <Link
          href="/dashboard/calculators"
          className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />Calculators
        </Link>
      </div>
      <h1 className="mb-2 text-2xl font-semibold">Philippine Tax Calculator</h1>
      <p className="mb-6 text-muted-foreground">
        Estimate your income tax, SSS, PhilHealth, and Pag-IBIG contributions based on TRAIN Law (2023+) rates.
      </p>

      {/* Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Income details</CardTitle>
          <CardDescription>
            Enter your monthly gross income to compute tax and mandatory deductions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="monthly-gross">Monthly gross income (PHP)</Label>
            <AmountInput
              id="monthly-gross"
              placeholder="0"
              className="w-full"
              value={monthlyGross}
              onChange={setMonthlyGross}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Net income options</p>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={deductTax}
                onChange={(e) => setDeductTax(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded"
              />
              <span className="text-sm">Deduct income tax from net income</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={deductContributions}
                onChange={(e) => setDeductContributions(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded"
              />
              <span className="text-sm">Deduct mandatory contributions from net income</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Uncheck to exclude that item from the take-home pay calculation.
            </p>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Contributions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Mandatory contributions
              </CardTitle>
              <CardDescription>
                Pre-tax deductions withheld from your paycheck each month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SSS (4.5% of monthly salary credit)</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(result.contributions.sssMonthly)}/mo
                  &nbsp;•&nbsp;
                  {formatCurrency(result.contributions.sssAnnual)}/yr
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PhilHealth (2.5% of salary, employee share)</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(result.contributions.philhealthMonthly)}/mo
                  &nbsp;•&nbsp;
                  {formatCurrency(result.contributions.philhealthAnnual)}/yr
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pag-IBIG (2% of salary, max ₱100/mo)</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(result.contributions.pagibigMonthly)}/mo
                  &nbsp;•&nbsp;
                  {formatCurrency(result.contributions.pagibigAnnual)}/yr
                </span>
              </div>
              <div className="flex justify-between border-t pt-3 font-semibold">
                <span>Total contributions</span>
                <span className="tabular-nums">
                  {formatCurrency(result.contributions.totalMonthly)}/mo
                  &nbsp;•&nbsp;
                  {formatCurrency(result.contributions.totalAnnual)}/yr
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tax */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Income tax
              </CardTitle>
              <CardDescription>
                Based on TRAIN Law (2023+). Mandatory contributions are deducted before tax is computed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual gross income</span>
                <span className="font-medium tabular-nums">{formatCurrency(result.annualGross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total contributions (pre-tax deduction)</span>
                <span className="font-medium tabular-nums text-muted-foreground">
                  −{formatCurrency(result.contributions.totalAnnual)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Taxable income</span>
                <span className="font-medium tabular-nums">{formatCurrency(result.taxableIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax bracket (marginal rate)</span>
                <span className="font-medium">{result.taxBracketLabel}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-muted-foreground">Annual income tax</span>
                <span className="font-medium tabular-nums text-destructive">
                  {formatCurrency(result.annualTax)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly income tax</span>
                <span className="font-medium tabular-nums text-destructive">
                  {formatCurrency(result.monthlyTax)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective tax rate</span>
                <span className="font-medium">{result.effectiveTaxRatePct.toFixed(2)}%</span>
              </div>
            </CardContent>
          </Card>

          {/* Net take-home */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                Estimated take-home pay
              </CardTitle>
              <CardDescription>{netDescription()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual gross</span>
                <span className="font-medium tabular-nums">{formatCurrency(result.annualGross)}</span>
              </div>
              {deductTax && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Income tax</span>
                  <span className="font-medium tabular-nums text-destructive">
                    −{formatCurrency(result.annualTax)}
                  </span>
                </div>
              )}
              {deductContributions && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mandatory contributions</span>
                  <span className="font-medium tabular-nums text-destructive">
                    −{formatCurrency(result.contributions.totalAnnual)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <span>Monthly take-home</span>
                <span className="tabular-nums text-primary">{formatCurrency(netMonthly)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Annual take-home</span>
                <span className="tabular-nums text-primary">{formatCurrency(netAnnual)}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

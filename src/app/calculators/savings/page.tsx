"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import {
  runSavingsCalculation,
  PH_DEFAULT_INTEREST_RATE_PCT,
  PH_DEFAULT_INFLATION_RATE_PCT,
} from "@/lib/savings-calculator";
import { useUser } from "@/hooks/use-user";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Info, ChevronLeft } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();

export default function SavingsCalculatorPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  const [startYear, setStartYear] = useState(CURRENT_YEAR);
  const [endYear, setEndYear] = useState(CURRENT_YEAR + 10);
  const [initialAmount, setInitialAmount] = useState("");
  const [annualContribution, setAnnualContribution] = useState("");
  const [interestRatePct, setInterestRatePct] = useState(String(PH_DEFAULT_INTEREST_RATE_PCT));
  const [inflationRatePct, setInflationRatePct] = useState(String(PH_DEFAULT_INFLATION_RATE_PCT));

  const result = useMemo(() => {
    const initial = parseInt(initialAmount.replace(/\D/g, ""), 10) || 0;
    const annual = parseInt(annualContribution.replace(/\D/g, ""), 10) || 0;
    const years = endYear - startYear;
    if (years < 0) return null;
    if (initial === 0 && annual === 0) return null;

    const interest = parseFloat(interestRatePct) || 0;
    const inflation = parseFloat(inflationRatePct) || 0;

    return runSavingsCalculation({
      startYear,
      endYear,
      initialAmount: initial,
      annualContribution: annual,
      interestRatePct: interest,
      inflationRatePct: inflation,
    });
  }, [
    startYear,
    endYear,
    initialAmount,
    annualContribution,
    interestRatePct,
    inflationRatePct,
  ]);

  if (loading || !user) {
    if (!loading && !user) router.replace("/login");
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-4">
      <div className="mb-6">
        <Link
          href="/calculators"
          className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />Calculators
        </Link>
      </div>
      <h1 className="mb-2 text-2xl font-semibold">Savings & Investment Calculator</h1>
      <p className="mb-6 text-muted-foreground">
        Plan your savings with compound interest. Uses Philippine-focused defaults (BSP time deposit–style rates and inflation). Adjust rates to match your product or expectations.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>When do you save?</CardTitle>
          <CardDescription>
            Start year is when you begin saving; end year is when you plan to withdraw or reach maturity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-year">Start year</Label>
              <Input
                id="start-year"
                type="number"
                min={1900}
                max={2100}
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value, 10) || CURRENT_YEAR)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-year">Withdraw / maturity year</Label>
              <Input
                id="end-year"
                type="number"
                min={1900}
                max={2100}
                value={endYear}
                onChange={(e) => setEndYear(parseInt(e.target.value, 10) || CURRENT_YEAR)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Amounts (PHP)</CardTitle>
          <CardDescription>
            Initial lump sum (optional) and how much you will add each year. Contributions are assumed at end of each year.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="initial">Initial amount (lump sum)</Label>
            <AmountInput
              id="initial"
              placeholder="0"
              className="w-full"
              value={initialAmount}
              onChange={setInitialAmount}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="annual">Annual contribution</Label>
            <AmountInput
              id="annual"
              placeholder="0"
              className="w-full"
              value={annualContribution}
              onChange={setAnnualContribution}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Rates (Philippine context)</CardTitle>
          <CardDescription>
            Defaults: interest ~4% (PH time deposit 1–5 years), inflation ~3.5% (BSP/PSA outlook). Change if you use a different product or assumption.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="interest">Annual interest / growth rate (%)</Label>
            <Input
              id="interest"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={interestRatePct}
              onChange={(e) => setInterestRatePct(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inflation">Annual inflation rate (%)</Label>
            <Input
              id="inflation"
              type="number"
              min={-10}
              max={100}
              step={0.1}
              value={inflationRatePct}
              onChange={(e) => setInflationRatePct(e.target.value)}
            />
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Inflation reduces purchasing power. &quot;Real&quot; value below shows your balance in today’s pesos.
            </p>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Projection ({result.years} {result.years === 1 ? "year" : "years"})
            </CardTitle>
            <CardDescription>
              From {startYear} to {endYear}. Compound interest applied annually; contributions at end of each year.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total you put in</span>
              <span className="font-medium">{formatCurrency(result.totalContributions)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Interest / growth (nominal)</span>
              <span className="font-medium text-emerald-600">
                {formatCurrency(result.interestEarned)}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Future value (nominal PHP)</span>
              <span>{formatCurrency(result.futureValueNominal)}</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Real value (in today’s purchasing power)</span>
                <span className="font-medium">{formatCurrency(result.futureValueReal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Real interest (after inflation)</span>
                <span className="font-medium">
                  {result.realInterestEarned >= 0
                    ? formatCurrency(result.realInterestEarned)
                    : formatCurrency(-result.realInterestEarned) + " (loss)"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {startYear > endYear && (
        <p className="mt-4 text-sm text-destructive">
          Withdraw year must be after start year.
        </p>
      )}
    </div>
  );
}

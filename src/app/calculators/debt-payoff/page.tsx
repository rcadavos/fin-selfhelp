"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { runDebtPayoffCalculation } from "@/lib/debt-payoff-calculator";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Info, ChevronLeft } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function DebtPayoffCalculatorPage() {
  const [balance, setBalance] = useState("");
  const [annualRatePct, setAnnualRatePct] = useState("12");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [extraPayment, setExtraPayment] = useState("");

  const result = useMemo(() => {
    const bal = parseInt(balance.replace(/\D/g, ""), 10) || 0;
    const minPmt = parseInt(monthlyPayment.replace(/\D/g, ""), 10) || 0;
    const extra = parseInt(extraPayment.replace(/\D/g, ""), 10) || 0;
    const rate = parseFloat(annualRatePct) || 0;
    if (bal <= 0 || minPmt <= 0) return null;
    return runDebtPayoffCalculation({
      balance: bal,
      annualInterestRatePct: rate,
      monthlyPayment: minPmt,
      extraMonthlyPayment: extra,
    });
  }, [balance, annualRatePct, monthlyPayment, extraPayment]);

  return (
    <div className="container mx-auto w-full min-w-0 max-w-4xl px-4 pb-8 pt-4">
      <div className="mb-6">
        <Link
          href="/calculators"
          className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />Calculators
        </Link>
      </div>
      <h1 className="mb-2 text-2xl font-semibold">Debt Payoff Calculator</h1>
      <p className="mb-6 text-muted-foreground">
        See how long it takes to pay off a loan and how much interest you pay. Add extra payments to see the impact.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Loan details</CardTitle>
          <CardDescription>
            Enter current balance, annual interest rate, and your monthly payment. Optionally add an extra amount each month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="balance">Current balance (PHP)</Label>
            <AmountInput
              id="balance"
              placeholder="0"
              className="w-full"
              value={balance}
              onChange={setBalance}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Annual interest rate (%)</Label>
            <Input
              id="rate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={annualRatePct}
              onChange={(e) => setAnnualRatePct(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly">Minimum monthly payment (PHP)</Label>
            <AmountInput
              id="monthly"
              placeholder="0"
              className="w-full"
              value={monthlyPayment}
              onChange={setMonthlyPayment}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="extra">Extra monthly payment (PHP, optional)</Label>
            <AmountInput
              id="extra"
              placeholder="0"
              className="w-full"
              value={extraPayment}
              onChange={setExtraPayment}
            />
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Adding even a small extra payment can shorten the payoff period and reduce total interest.
            </p>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Payoff result
            </CardTitle>
            <CardDescription>
              Based on your payment{parseInt(extraPayment.replace(/\D/g, ""), 10) ? " and extra payment" : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Months to payoff</span>
              <span className="font-medium">{result.monthsToPayoff}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payoff date</span>
              <span className="font-medium">
                {MONTH_NAMES[result.payoffMonth - 1]} {result.payoffYear}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total interest paid</span>
              <span className="text-destructive">{formatCurrency(result.totalInterestPaid)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {balance && monthlyPayment && parseInt(monthlyPayment.replace(/\D/g, ""), 10) > 0 && !result && (
        <p className="mt-4 text-sm text-destructive">
          Payment is too low to pay off this balance. Try increasing the monthly payment or adding extra payments.
        </p>
      )}
    </div>
  );
}

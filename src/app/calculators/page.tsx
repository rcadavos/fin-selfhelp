"use client";

import { useRouter } from "next/navigation";
import { ContentHeader } from "@/components/app/content-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, CreditCard, Calculator, Receipt } from "lucide-react";

export default function CalculatorsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto w-full min-w-0 max-w-4xl px-4 pb-8 pt-4">
      <ContentHeader
        title="Calculators"
        subtitle="Plan savings, debt payoff, and more. Pick a calculator below."
        icon={Calculator}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Card
          className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
          onClick={() => router.push("/calculators/tax")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Tax Calculator
            </CardTitle>
            <CardDescription>
              Estimate your PH income tax, SSS, PhilHealth, and Pag-IBIG contributions. See your take-home pay based on TRAIN Law rates.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
          onClick={() => router.push("/calculators/savings")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Savings Calculator
            </CardTitle>
            <CardDescription>
              Project future value of savings with compound interest. Philippine-focused defaults (time deposit, inflation).
            </CardDescription>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
          onClick={() => router.push("/calculators/debt-payoff")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Debt Payoff Calculator
            </CardTitle>
            <CardDescription>
              See how long to pay off a loan and total interest with fixed or extra payments.
            </CardDescription>
          </CardHeader>
        </Card>

      </div>
    </div>
  );
}

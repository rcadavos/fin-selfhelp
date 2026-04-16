"use client";

import { useRouter } from "next/navigation";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ContentHeader } from "@/components/app/content-header";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, CreditCard, Calculator } from "lucide-react";

export default function CalculatorsPage() {
  const router = useRouter();
  const { user, loading } = useUser();

  if (loading || !user) {
    if (!loading && !user) router.replace("/login");
    return <DashboardSkeleton variant="calculators-index" />;
  }

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
          onClick={() => router.push("/dashboard/calculators/savings")}
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
          onClick={() => router.push("/dashboard/calculators/debt-payoff")}
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

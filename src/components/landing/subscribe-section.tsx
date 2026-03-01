"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { subscriptionPlanQueryOptions } from "@/lib/query/subscription-plan";
import { Check, Sparkles } from "lucide-react";

const benefits = [
  "Due-date reminders (3 days, 1 day, on the day)",
  "Unlimited expenses",
  "Export cashflow (CSV/PDF)",
  "Priority support",
  "Can leave review and suggestions",
];

export function SubscribeSection({ className }: { className?: string }) {
  const { data: plan } = useQuery(subscriptionPlanQueryOptions());
  return (
    <section
      id="subscribe"
      className={cn(
        "border-t bg-muted/30 px-4 py-16 sm:px-6 lg:px-8",
        className
      )}
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Subscribe for more
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Unlock reminders, unlimited expenses, and extra features.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-3xl mx-auto">
          {/* Free tier card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Free</CardTitle>
              <CardDescription>
                Get started with basic tracking.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Up to 5 expenses</p>
              <p>Net take-home & balance</p>
              <p>Categories & summary</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/signup">Create account</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Subscriber card – colored */}
          <Card className="border-primary/50 bg-primary/5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full" aria-hidden />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg text-foreground">{plan?.name ?? "Pro"}</CardTitle>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                {plan?.originalPriceAmount != null && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatCurrency(plan.originalPriceAmount, plan.priceCurrency)}
                  </span>
                )}
                <span className="text-2xl font-bold text-foreground">
                  {plan ? formatCurrency(plan.priceAmount, plan.priceCurrency) : "$3"}
                </span>
                <span className="text-sm text-muted-foreground">/{plan?.interval ?? "month"}</span>
              </div>
              <CardDescription className="mt-1">
                Reminders, unlimited expenses, export & more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {benefits.map((item) => (
                <div key={item} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href="/payment" className="flex items-center justify-center gap-2">
                  <span>Subscribe & pay</span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {plan?.originalPriceAmount != null && (
                      <span className="font-normal opacity-90 line-through">
                        {formatCurrency(plan.originalPriceAmount, plan?.priceCurrency)}
                      </span>
                    )}
                    <span>
                      {plan ? formatCurrency(plan.priceAmount, plan.priceCurrency) : "$3"}
                      <span className="font-normal opacity-90">/{plan?.interval ?? "month"}</span>
                    </span>
                  </span>
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}

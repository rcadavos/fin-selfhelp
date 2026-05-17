import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrendingUp, CreditCard, Receipt, ArrowRight } from "lucide-react";

const calculators = [
  {
    href: "/calculators/tax",
    title: "Tax Calculator",
    description:
      "Estimate your PH income tax, SSS, PhilHealth, and Pag-IBIG contributions. See your take-home pay based on TRAIN Law rates.",
    icon: Receipt,
    cta: "Open Tax Calculator",
  },
  {
    href: "/calculators/savings",
    title: "Savings Calculator",
    description:
      "Project future value of savings with compound interest. Philippine-focused defaults (time deposit, inflation).",
    icon: TrendingUp,
    cta: "Open Savings Calculator",
  },
  {
    href: "/calculators/debt-payoff",
    title: "Debt Payoff Calculator",
    description:
      "See how long to pay off a loan and total interest with fixed or extra payments.",
    icon: CreditCard,
    cta: "Open Debt Payoff Calculator",
  },
] as const;

export function CalculatorsSection({ className }: { className?: string }) {
  return (
    <section
      id="calculators"
      className={cn("border-t px-4 py-16 sm:px-6 lg:px-8", className)}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Free calculators
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Plan your taxes, savings, and debt payoff — no sign-up required.
          </p>
        </div>

        <div className="mx-auto flex max-w-5xl flex-wrap items-stretch justify-center gap-6">
          {calculators.map(({ href, title, description, icon: Icon, cta }) => (
            <Card
              key={href}
              className="flex w-full max-w-sm flex-col border-border/50 transition-colors hover:border-primary/50"
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
                <CardDescription className="mt-2">{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter className="mt-auto w-full">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={href} className="flex items-center justify-center gap-2">
                    <span>{cta}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { SubscriptionPlanRow } from "@/actions/subscription-plan";
import { TRIAL_DURATION_DAYS } from "@/lib/constants/trial";
import { Check, Gem, Sparkles } from "lucide-react";


export const freeBenefits = [
  "Unlimited expense & planned expense rows",
  "Reminders (up to 5 items)",
  "1 planned expense reminder (in-app & email)",
  "Unlimited reminders — upgrade to Pro",
];

export const proBenefits = [
  "Ask OmniTrak — AI assistant for your finances & documents",
  "Email reminders for planned expenses and reminders",
  "Unlimited reminders",
  "Partner sharing (invite by email)",
  "Custom expense categories",
];

export const premiumExtra = ["Everything in Pro", "Rent Tracker", "Payment Tracker", "All Future Features"];

export function SubscribeSection({
  className,
  proPlan,
  premiumPlan,
}: {
  className?: string;
  proPlan: SubscriptionPlanRow;
  premiumPlan: SubscriptionPlanRow;
}) {
  return (
    <section id="subscribe" className={cn("border-t bg-muted/30 px-4 py-16 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Plans</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free, upgrade to Pro for email reminders and unlimited lists, or Premium for extra modules.
          </p>
          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              🎁 Every new account starts with a {TRIAL_DURATION_DAYS}-day Pro free trial — no card required.
            </span>
          </div>
        </div>

        <div className="mx-auto flex max-w-5xl flex-wrap items-stretch justify-center gap-6">
          <Card className="flex w-full max-w-sm flex-col border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Free</CardTitle>
              <CardDescription>
                Track planned expenses and cashflow, no card required. New accounts get {TRIAL_DURATION_DAYS} days of Pro to start.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-2 text-sm text-muted-foreground">
              {freeBenefits.map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
                  <span>{f}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="mt-auto w-full">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/signup">Create account</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="relative flex h-full w-full max-w-sm flex-col overflow-hidden border-primary/60 bg-primary/5 shadow-xl ring-2 ring-primary/20 lg:scale-[1.06] lg:z-10">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/10" aria-hidden />
            <div className="absolute left-0 top-0">
              <span className="inline-flex items-center gap-1 rounded-br-xl bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                🔥 Most Popular
              </span>
            </div>
            <CardHeader className="pt-8">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden />
                <CardTitle className="text-lg text-foreground">{proPlan.name}</CardTitle>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                {proPlan.originalPriceAmount != null && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatCurrency(proPlan.originalPriceAmount, proPlan.priceCurrency)}
                  </span>
                )}
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(proPlan.priceAmount, proPlan.priceCurrency)}
                </span>
                <span className="text-sm text-muted-foreground">/{proPlan.interval}</span>
              </div>
              <CardDescription className="mt-1">Full access on My Expenses and Reminders</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-2 text-sm">
              {proBenefits.map((item) => (
                <div key={item} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="relative z-10 mt-auto w-full">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href="/account/subscription/payment?plan=pro" className="flex items-center justify-center gap-2">
                  <span>Get Pro</span>
                  <span className="font-semibold">
                    {formatCurrency(proPlan.priceAmount, proPlan.priceCurrency)}/{proPlan.interval}
                  </span>
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {premiumPlan.enabled && (
          <Card className="relative flex h-full w-full max-w-sm flex-col overflow-hidden border-sky-500/40 bg-sky-500/[0.06] shadow-sm dark:bg-sky-950/20">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-sky-500/10" aria-hidden />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gem className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden />
                <CardTitle className="text-lg text-foreground">{premiumPlan.name}</CardTitle>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                {premiumPlan.originalPriceAmount != null && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatCurrency(premiumPlan.originalPriceAmount, premiumPlan.priceCurrency)}
                  </span>
                )}
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(premiumPlan.priceAmount, premiumPlan.priceCurrency)}
                </span>
                <span className="text-sm text-muted-foreground">/{premiumPlan.interval}</span>
              </div>
              <CardDescription className="mt-1">Pro plus premium-only trackers.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-2 text-sm">
              {premiumExtra.map((item) => (
                <div key={item} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="relative z-10 mt-auto w-full">
              <Button className="w-full bg-sky-600 text-white hover:bg-sky-600/90 dark:bg-sky-500" asChild>
                <Link
                  href="/account/subscription/payment?plan=premium"
                  className="flex items-center justify-center gap-2"
                >
                  <span>Get Premium</span>
                  <span className="font-semibold">
                    {formatCurrency(premiumPlan.priceAmount, premiumPlan.priceCurrency)}/{premiumPlan.interval}
                  </span>
                </Link>
              </Button>
            </CardFooter>
          </Card>
          )}
        </div>
      </div>
    </section>
  );
}

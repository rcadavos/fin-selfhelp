import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { SubscriptionPlanRow } from "@/actions/subscription-plan";
import { TRIAL_DESCRIPTION } from "@/lib/constants/trial";
import { Check } from "lucide-react";
import { Amount } from "@/components/passbook/amount";
import { Stamp } from "@/components/passbook/stamp";

export const freeBenefits = [
  "Unlimited expense & planned expense rows",
  "Due dates & all core tracking",
  "Reminders (up to 5 items)",
  "1 planned-expense reminder (in-app)",
];

export const proBenefits = [
  "Ask OmniTrak — AI assistant for your finances & documents",
  "Email reminders for planned expenses and reminders",
  "Unlimited reminders",
  "Partner sharing (invite by email)",
  "Custom expense categories",
];

export const premiumExtra = ["Everything in Pro", "Rent Tracker", "Payment Tracker", "All Future Features"];

function PriceRow({
  amount,
  currency,
  interval,
  original,
  onPrimary,
}: {
  amount: number;
  currency: string;
  interval: string;
  original: number | null;
  onPrimary: boolean;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {original != null && (
        <span
          className={cn(
            "font-mono text-sm line-through",
            onPrimary ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatCurrency(original, currency)}
        </span>
      )}
      <Amount
        value={amount}
        currency={currency}
        className={cn("text-2xl font-bold", onPrimary ? "text-primary-foreground" : "text-foreground")}
      />
      <span
        className={cn(
          "font-mono text-xs",
          onPrimary ? "text-primary-foreground/80" : "text-muted-foreground"
        )}
      >
        / {interval}
      </span>
    </div>
  );
}

export function SubscribeSection({
  className,
  proPlan,
  premiumPlan,
}: {
  className?: string;
  proPlan: SubscriptionPlanRow;
  premiumPlan: SubscriptionPlanRow;
}) {
  const plans = [
    {
      key: "free",
      name: "Free",
      amount: 0,
      currency: proPlan.priceCurrency,
      interval: proPlan.interval,
      original: null as number | null,
      tag: "Track planned expenses and cashflow, no card required.",
      benefits: freeBenefits,
      cta: { label: "Create account", href: "/signup" },
      variant: "outline" as const,
      highlight: false,
    },
    {
      key: "pro",
      name: proPlan.name,
      amount: proPlan.priceAmount,
      currency: proPlan.priceCurrency,
      interval: proPlan.interval,
      original: proPlan.originalPriceAmount,
      tag: "Full access to My Expenses and Reminders.",
      benefits: proBenefits,
      cta: { label: "Get Pro", href: "/account/subscription/payment?plan=pro" },
      variant: "default" as const,
      highlight: true,
    },
    ...(premiumPlan.enabled
      ? [
          {
            key: "premium",
            name: premiumPlan.name,
            amount: premiumPlan.priceAmount,
            currency: premiumPlan.priceCurrency,
            interval: premiumPlan.interval,
            original: premiumPlan.originalPriceAmount,
            tag: "Pro plus premium-only trackers.",
            benefits: premiumExtra,
            cta: { label: "Get Premium", href: "/account/subscription/payment?plan=premium" },
            variant: "outline" as const,
            highlight: false,
          },
        ]
      : []),
  ];

  return (
    <section
      id="subscribe"
      className={cn("border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem]">
          Plans
        </h2>
        <p className="mt-3 max-w-[52ch] text-muted-foreground">
          Start free. Upgrade to Pro for the AI assistant and email reminders, or Premium for extra
          trackers.
        </p>

        <div
          className={cn(
            "mt-10 grid grid-cols-1 gap-4",
            plans.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
          )}
        >
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={cn(
                // overflow-hidden matters: the highlighted plan's header bleeds to
                // the card edge with negative margins, and needs clipping to the
                // card's own rounded corners now that each plan is its own card.
                "surface flex flex-col overflow-hidden border bg-card p-6 shadow-sm sm:p-7",
                plan.highlight ? "border-primary shadow-md" : "border-border"
              )}
            >
              {plan.highlight ? (
                <div className="-mx-6 -mt-6 bg-primary px-6 pb-5 pt-6 text-primary-foreground sm:-mx-7 sm:-mt-7 sm:px-7 sm:pt-7">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <span className="text-[17px] font-bold">{plan.name}</span>
                    <Stamp
                      variant="muted"
                      className="border-primary-foreground/70 text-primary-foreground"
                    >
                      Most popular
                    </Stamp>
                  </div>
                  <PriceRow
                    amount={plan.amount}
                    currency={plan.currency}
                    interval={plan.interval}
                    original={plan.original}
                    onPrimary
                  />
                  <p className="mt-1.5 text-sm text-primary-foreground/85">{plan.tag}</p>
                </div>
              ) : (
                <div className="border-b border-border pb-5">
                  <span className="text-[17px] font-bold text-foreground">{plan.name}</span>
                  <PriceRow
                    amount={plan.amount}
                    currency={plan.currency}
                    interval={plan.interval}
                    original={plan.original}
                    onPrimary={false}
                  />
                  <p className="mt-1.5 text-sm text-muted-foreground">{plan.tag}</p>
                </div>
              )}

              <ul className={cn("flex-1", plan.highlight ? "mt-5" : "mt-4")}>
                {plan.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-2.5 border-b border-border py-2.5 text-sm last:border-b-0"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Button variant={plan.variant} asChild className="mt-6 h-11 w-full">
                <Link href={plan.cta.href}>{plan.cta.label}</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
          {TRIAL_DESCRIPTION}
        </p>
      </div>
    </section>
  );
}

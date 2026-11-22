import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/passbook/amount";
import { Stamp } from "@/components/passbook/stamp";
import { OttoLanding } from "@/components/mascot/otto-landing";
import { ASSISTANT_NAME, MASCOT_NAME } from "@/lib/constants/mascot";
import { TRIAL_DURATION_DAYS } from "@/lib/constants/trial";
import { AskOttoDemo } from "@/components/landing/ask-otto-demo";
import { AuthCtaButton } from "@/components/landing/cta-button";

/** A slim bar, filled to `percent`, for the category and goal samples. */
function MeterBar({ segments }: { segments: { percent: number; className: string }[] }) {
  return (
    <span aria-hidden className="flex h-2 w-24 overflow-hidden rounded-full bg-muted">
      {segments.map((s, i) => (
        <span key={i} className={s.className} style={{ width: `${s.percent}%` }} />
      ))}
    </span>
  );
}

/**
 * Each feature carries a sample of what it looks like in the app, in the app's own
 * passbook style, where the row used to repeat its name as a tag.
 */
const features: { name: string; description: string; sample: ReactNode }[] = [
  {
    name: "Log expenses daily",
    description: "Capture every peso in seconds. Entries group themselves by category as you go.",
    sample: (
      <span className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">Lunch • Food</span>
        <Amount formatted="₱289.00" className="text-sm" />
      </span>
    ),
  },
  {
    name: "Bills",
    description: "Recurring bills with due dates, paid stamps, and a full payment history per bill.",
    sample: (
      <span className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Meralco</span>
        <Stamp variant="paid">Paid</Stamp>
      </span>
    ),
  },
  {
    name: "Smart categories",
    description: "Spending sorted into clear buckets. Build your own categories on Pro.",
    sample: (
      <span className="flex items-center gap-2.5">
        <MeterBar
          segments={[
            { percent: 42, className: "bg-primary" },
            { percent: 27, className: "bg-primary/60" },
            { percent: 18, className: "bg-primary/30" },
          ]}
        />
        <span className="font-mono text-xs text-muted-foreground">Food 42%</span>
      </span>
    ),
  },
  {
    name: "Reminders",
    description: "In-app nudges before anything is due. Email reminders arrive with Pro.",
    sample: (
      <span className="flex items-center gap-2">
        <Bell className="size-3.5 text-warning" aria-hidden />
        <span className="font-mono text-xs text-muted-foreground">Tomorrow • 9:00 AM</span>
      </span>
    ),
  },
  {
    name: "Goal tracker",
    description: "Set a target and fund it kahit paunti-unti. Progress stays visible on your dashboard.",
    sample: (
      <span className="flex items-center gap-2.5">
        <MeterBar segments={[{ percent: 62, className: "bg-primary" }]} />
        <span className="font-mono text-xs text-muted-foreground">62% saved</span>
      </span>
    ),
  },
  {
    name: "Savings & debt calculators",
    description: "Free tax, savings, and debt-payoff tools. No account needed to use them.",
    sample: (
      <Link
        href="/calculators"
        className="group inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:text-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Open the calculators
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      </Link>
    ),
  },
];

export function FeaturesSection({ className }: { className?: string }) {
  return (
    <section id="features" className={cn("border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24", className)}>
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-[20ch] text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem]">
          Everything a household ledger should do
        </h2>
        <p className="mt-3 max-w-[52ch] text-muted-foreground">
          Daily expenses, bills, lists, goals, and calculators, tuned for everyday
          Filipino household use.
        </p>

        {/* Ask Otto demo: he lands on it, then tilts his head with a "?" every few seconds. */}
        <div className="relative mt-[190px] max-sm:mt-[150px]">
          <OttoLanding
            pose="curious"
            size={180}
            from="left"
            label={`${MASCOT_NAME} lands on the ${ASSISTANT_NAME} card and tilts his head, curious`}
            className="left-5 max-sm:![--otto:140px]"
          />
          <AskOttoDemo />
        </div>

        {/* Feature statement rows, each with a sample of the feature on the right. */}
        <div className="mt-10 border-t border-border">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="grid grid-cols-1 gap-y-2 border-b border-border py-5 lg:grid-cols-[minmax(180px,5fr)_7fr_13rem] lg:items-center lg:gap-x-8"
            >
              <span className="text-[17px] font-bold tracking-tight text-foreground">
                {feature.name}
              </span>
              <span className="text-sm text-muted-foreground">{feature.description}</span>
              <span className="mt-1 flex lg:mt-0 lg:justify-end">{feature.sample}</span>
            </div>
          ))}
        </div>

        {/* The section ends on the offer, so a visitor sold on a feature can act on it here. */}
        <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold tracking-tight text-foreground">
              Try every feature free for {TRIAL_DURATION_DAYS} days.
            </p>
            <p className="mt-1 max-w-[52ch] text-sm text-muted-foreground">
              {ASSISTANT_NAME}, email reminders, and custom categories included. No card, no bank
              linking.
            </p>
          </div>
          <AuthCtaButton size="lg" />
        </div>
      </div>
    </section>
  );
}

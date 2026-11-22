import { cn } from "@/lib/utils";
import { Amount } from "@/components/passbook/amount";
import { Otto } from "@/components/mascot/otto";
import { OttoLanding } from "@/components/mascot/otto-landing";
import { ASSISTANT_NAME, MASCOT_NAME } from "@/lib/constants/mascot";

const features: { name: string; description: string; tag: string }[] = [
  {
    name: "Log expenses daily",
    description: "Capture every peso in seconds. Entries group themselves by category as you go.",
    tag: "Expenses",
  },
  {
    name: "Bills",
    description: "Recurring bills with due dates, paid stamps, and a full payment history per bill.",
    tag: "Bills",
  },
  {
    name: "Smart categories",
    description: "Spending sorted into clear buckets. Build your own categories on Pro.",
    tag: "Categories",
  },
  {
    name: "Reminders",
    description: "In-app nudges before anything is due. Email reminders arrive with Pro.",
    tag: "Reminders",
  },
  {
    name: "Goal tracker",
    description: "Set a target and fund it kahit paunti-unti. Progress stays visible on your dashboard.",
    tag: "Goals",
  },
  {
    name: "Savings & debt calculators",
    description: "Free tax, savings, and debt-payoff tools. No account needed to use them.",
    tag: "Calculators",
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

        {/* Ask Otto band: he lands on it, then tilts his head with a "?" every few seconds. */}
        <div className="relative mt-[190px] max-sm:mt-[150px]">
          <OttoLanding
            pose="curious"
            size={180}
            from="left"
            label={`${MASCOT_NAME} lands on the ${ASSISTANT_NAME} card and tilts his head, curious`}
            className="left-5 max-sm:![--otto:140px]"
          />
        <div className="relative z-[1] grid overflow-hidden surface border border-border bg-card lg:grid-cols-11">
          <div className="flex flex-col justify-center gap-3 p-6 sm:p-8 lg:col-span-5">
            <h3 className="text-xl font-bold tracking-tight text-foreground">{ASSISTANT_NAME}</h3>
            <p className="max-w-[40ch] text-muted-foreground">
              A private AI assistant that reads your ledger, not your bank. Ask about spending, due
              dates, or your own uploaded documents.
            </p>
            <span className="mt-1 font-mono text-[11px] uppercase tracking-wider text-primary">
              Included with Pro and Premium
            </span>
          </div>
          <div
            className="flex flex-col gap-3 border-t border-border bg-background p-6 sm:p-8 lg:col-span-6 lg:border-l lg:border-t-0"
            aria-label="Sample assistant conversation"
          >
            <p className="max-w-[85%] self-end surface bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
              How much did we spend on utilities last month?
            </p>
            <div className="flex max-w-[90%] items-end gap-2.5 self-start">
              <Otto pose="face" size={34} alt={MASCOT_NAME} />
              <p className="surface border border-border bg-card px-3.5 py-2.5 text-sm text-foreground">
                <Amount formatted="₱5,842" className="text-sm" /> across Meralco, Maynilad, and Globe.
                That is 8% lower than May.
              </p>
            </div>
            <p className="max-w-[85%] self-end surface bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
              When is rent due?
            </p>
            <div className="flex max-w-[90%] items-end gap-2.5 self-start">
              <Otto pose="face" size={34} alt={MASCOT_NAME} />
              <p className="surface border border-border bg-card px-3.5 py-2.5 text-sm text-foreground">
                Aug 1. You have marked 3 of 3 rent payments paid on time this quarter.
              </p>
            </div>
          </div>
        </div>
        </div>

        {/* Feature statement rows */}
        <div className="mt-10 border-t border-border">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1.5 border-b border-border py-5 sm:grid-cols-[minmax(180px,5fr)_7fr_auto] sm:gap-x-8"
            >
              <span className="text-[17px] font-bold tracking-tight text-foreground">
                {feature.name}
              </span>
              <span className="order-2 col-span-2 text-sm text-muted-foreground sm:order-none sm:col-span-1">
                {feature.description}
              </span>
              <span className="order-1 justify-self-start rounded-full border border-hairline-strong px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:order-none sm:self-center sm:justify-self-end">
                {feature.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

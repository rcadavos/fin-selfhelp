import { cn } from "@/lib/utils";
import { Amount } from "@/components/passbook/amount";
import { Stamp } from "@/components/passbook/stamp";
import { LedgerRow } from "@/components/passbook/dot-leader";

const steps = [
  {
    num: "01",
    title: "Add your tracked accounts",
    description: "Cash, e-wallets, bank accounts. Balances stay yours to enter.",
  },
  {
    num: "02",
    title: "Log expenses & planned expenses",
    description: "Daily spending plus the bills you already know are coming.",
  },
  {
    num: "03",
    title: "Get reminded, then mark paid",
    description: "Due-date nudges arrive early. One tap stamps the bill paid.",
  },
  {
    num: "04",
    title: "Review your monthly summary",
    description: "Spend, planned vs paid, and savings in one statement view.",
  },
];

const miniBars = [
  { h: "40%", accent: false },
  { h: "62%", accent: true },
  { h: "52%", accent: false },
  { h: "78%", accent: true },
  { h: "45%", accent: false },
  { h: "88%", accent: true },
];

function Vignette({ index }: { index: number }) {
  return (
    <div className="mt-4 surface border border-border bg-card p-3 text-xs">
      {index === 0 && (
        <LedgerRow label={<span>BPI Savings</span>}>
          <Amount formatted="₱52,300" className="text-xs" />
        </LedgerRow>
      )}
      {index === 1 && (
        <LedgerRow label={<span>Groceries</span>}>
          <Amount formatted="₱1,842.50" className="text-xs" />
        </LedgerRow>
      )}
      {index === 2 && (
        <div className="flex items-center justify-between">
          <span>Meralco</span>
          <Stamp variant="paid">Paid</Stamp>
        </div>
      )}
      {index === 3 && (
        <div className="flex h-8 items-end gap-1" aria-hidden>
          {miniBars.map((bar, i) => (
            <span
              key={i}
              className={cn("flex-1 rounded-t-sm", bar.accent ? "bg-primary" : "bg-chart-compare/60")}
              style={{ height: bar.h }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HowItWorksSection({ className }: { className?: string }) {
  return (
    <section
      id="how-it-works"
      className={cn("border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem]">
          How it works
        </h2>
        <p className="mt-3 max-w-[52ch] text-muted-foreground">
          Four steps to a clearer view of your finances.
        </p>

        <div className="mt-10 grid grid-cols-1 border-t border-hairline-strong sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={cn(
                "border-border py-7 pr-5 sm:pr-6",
                "pl-0",
                i > 0 && "border-t",
                i < 2 ? "sm:border-t-0" : "sm:border-t",
                i % 2 === 0 ? "sm:pl-0" : "sm:border-l sm:pl-6",
                "lg:border-t-0",
                i === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-6"
              )}
            >
              <span className="font-mono text-[11px] font-medium tracking-wider text-primary">
                {step.num}
              </span>
              <h3 className="mt-2 text-[15px] font-bold text-foreground">{step.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
              <Vignette index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const calculators = [
  {
    href: "/calculators/tax",
    title: "Tax Calculator",
    description:
      "Estimate your PH income tax, SSS, PhilHealth, and Pag-IBIG contributions. See your take-home pay based on TRAIN Law rates.",
    cta: "Open Tax Calculator",
  },
  {
    href: "/calculators/savings",
    title: "Savings Calculator",
    description:
      "Project future value of savings with compound interest. Philippine-focused defaults (time deposit, inflation).",
    cta: "Open Savings Calculator",
  },
  {
    href: "/calculators/debt-payoff",
    title: "Debt Payoff Calculator",
    description:
      "See how long to pay off a loan and total interest with fixed or extra payments.",
    cta: "Open Debt Payoff Calculator",
  },
] as const;

export function CalculatorsSection({ className }: { className?: string }) {
  return (
    <section
      id="calculators"
      className={cn("border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem]">
          Free calculators
        </h2>
        <p className="mt-3 max-w-[52ch] text-muted-foreground">
          Plan your taxes, savings, and debt payoff — no sign-up required.
        </p>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {calculators.map(({ href, title, description, cta }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col surface border border-border bg-card p-6 transition-colors hover:border-primary"
            >
              <h3 className="text-base font-bold text-foreground">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                {cta}
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

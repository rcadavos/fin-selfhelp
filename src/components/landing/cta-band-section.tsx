"use client";

import Link from "next/link";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/passbook/amount";
import { Stamp } from "@/components/passbook/stamp";
import { LedgerRow } from "@/components/passbook/dot-leader";
import { OttoLanding } from "@/components/mascot/otto-landing";
import { MASCOT_NAME } from "@/lib/constants/mascot";
import { SIGNUP_RECEIPT_LINES, SIGNUP_RECEIPT_TOTAL } from "@/lib/constants/landing";
import { AuthCtaButton } from "@/components/landing/cta-button";

/**
 * The page's closing pitch: what it costs to start, printed as a receipt that
 * totals ₱0.00, with the sign-up button as its checkout line.
 */
export function CtaBandSection({ className }: { className?: string }) {
  const { user, loading } = useUser();
  const visitor = !loading && !user;

  return (
    <section
      id="cta"
      className={cn(
        "border-t-2 border-primary bg-panel px-4 py-16 text-panel-foreground sm:px-6 lg:px-8 lg:py-24",
        className
      )}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-x-16 gap-y-2 lg:grid-cols-12">
        {/* Same top gap as the receipt's room for Otto, so the two centre on each other. */}
        <div className="lg:col-span-6 lg:pt-[150px]">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Ready to track it all?{" "}
            <span className="block text-panel-accent">It costs nothing to start.</span>
          </h2>
          <p className="mt-4 max-w-[46ch] text-panel-muted sm:text-lg">
            Bills, lists, and goals in one place. Open your dashboard in seconds, no bank linking
            required.
          </p>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          {/* Otto lands on the receipt and checks it over. */}
          <div className="relative mt-[150px] max-sm:mt-[120px]">
            <OttoLanding
              pose="check"
              size={150}
              from="right"
              label={`${MASCOT_NAME} lands on the receipt and checks it`}
              className="right-[8%] max-sm:![--otto:120px]"
            />
            <div className="surface relative z-[1] border border-transparent bg-card p-5 text-card-foreground shadow-lg dark:border-hairline-strong sm:p-6">
              <div className="flex items-baseline justify-between border-b border-border pb-3">
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Cost to start
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">TODAY</span>
              </div>

              <div>
                {SIGNUP_RECEIPT_LINES.map((line) => (
                  <LedgerRow
                    key={line.label}
                    label={<span className="text-sm font-medium">{line.label}</span>}
                    className="border-b border-border py-2.5 last:border-b-0"
                  >
                    {line.figure ? (
                      <Amount formatted={line.value} className="text-sm" />
                    ) : (
                      <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                        {line.value}
                      </span>
                    )}
                  </LedgerRow>
                ))}
              </div>

              <LedgerRow
                label={<span className="text-sm font-bold">Total due today</span>}
                className="mt-1 border-t border-hairline-strong pt-3"
              >
                <Amount formatted={SIGNUP_RECEIPT_TOTAL} className="text-base font-bold" />
                <Stamp variant="paid" className="ml-2.5 shrink-0">
                  Free
                </Stamp>
              </LedgerRow>

              <AuthCtaButton size="md" showCost={false} className="mt-6 w-full" />

              {visitor && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    Log in
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

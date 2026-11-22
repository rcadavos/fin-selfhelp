import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIAL_LABEL } from "@/lib/constants/trial";
import { OttoLanding } from "@/components/mascot/otto-landing";
import { OttoSays } from "@/components/mascot/otto-says";
import { MASCOT_NAME } from "@/lib/constants/mascot";
import { AuthCtaButton } from "@/components/landing/cta-button";
import { HeroLedger } from "@/components/landing/hero-ledger";

type HeroSectionProps = {
  className?: string;
};

const trustItems = [TRIAL_LABEL, "Free to start", "No bank linking", "Works on any device"];

export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section id="hero" className={cn(className)}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <span className="eyebrow block">Personal finance • Philippines</span>
            <h1 className="mt-4 text-balance text-[2rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
              Never miss a bill.{" "}
              <span className="block text-primary">Know where every peso goes.</span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-lg text-muted-foreground">
              Track expenses, bills, accounts, and goals in one simple app. Then ask {MASCOT_NAME},
              the built-in AI assistant, anything.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <AuthCtaButton size="lg" />
              <a
                href="#how-it-works"
                className="group inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-foreground underline decoration-hairline-strong underline-offset-[6px] transition-colors hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                See how it works
                <ArrowDown
                  className="size-3.5 text-primary transition-transform group-hover:translate-y-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </a>
            </div>
            <OttoSays face className="mt-9">
              Hi, I&rsquo;m <strong>{MASCOT_NAME}</strong>. I keep watch over your bills, day and night.
            </OttoSays>
          </div>

          <div className="lg:col-span-5">
            {/* Otto flies in and stands on the ledger's top edge, never over its numbers. */}
            <div className="relative mt-[180px] max-sm:mt-[130px]">
              <OttoLanding
                pose="idle"
                size={200}
                from="right"
                label={`${MASCOT_NAME} flies in and lands on the bills card`}
                className="right-[6%] max-sm:![--otto:140px]"
              />
              <div className="relative z-[1]">
                <HeroLedger />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-3.5 sm:px-6 lg:px-8">
          {trustItems.map((item, i) => (
            <span key={item} className="flex items-center gap-x-3">
              {i > 0 && (
                <span aria-hidden className="text-muted-foreground/50">
                  •
                </span>
              )}
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                {item}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

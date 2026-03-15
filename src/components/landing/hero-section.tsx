import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type HeroSectionProps = {
  className?: string;
};

export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className={cn(
        "relative overflow-hidden px-4 py-8 sm:px-6 sm:py-16 lg:px-8",
        className
      )}
    >
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Take control of your money
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
          Enter your net take-home pay, track where it goes by category, and see
          at a glance whether you&apos;re in the red or have money left over.
        </p>
        <div className="mx-auto mt-4 flex max-w-xl items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-left text-xs text-blue-800 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-300">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">Privacy note:</span> Your net take-home income is saved only in your browser&apos;s local storage — never sent to or stored in our database. If you clear your cache or use another device, you&apos;ll need to enter it again.
          </p>
        </div>
        <div className="mt-3 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild className="min-w-[180px]">
            <Link href="/signup">Start fixing your financial trouble</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="min-w-[180px]"
          >
            <a href="#how-it-works">How it works</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

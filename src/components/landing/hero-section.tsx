import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroSectionProps = {
  className?: string;
};

export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className={cn(
        "relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8",
        className
      )}
    >
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Take control of your money
        </h1>
        <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
          Enter your net take-home pay, track where it goes by category, and see
          at a glance whether you’re in the red or have money left over.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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

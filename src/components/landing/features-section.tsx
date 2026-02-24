import { Card, CardContent } from "@/components/ui/card";
import { Wallet, PieChart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "One number: your take-home",
    description:
      "Start with your net salary or income after tax and deductions. No sign-up required.",
    icon: Wallet,
  },
  {
    title: "Categories that make sense",
    description:
      "Split spending into grocery, transport, utilities, insurance, loans, savings, rent, and more.",
    icon: PieChart,
  },
  {
    title: "Instant status",
    description:
      "See right away if you’re overdraft, breaking even, or have money left over.",
    icon: TrendingUp,
  },
];

export function FeaturesSection({ className }: { className?: string }) {
  return (
    <section id="features" className={cn("px-4 py-16 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple cashflow tracker
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No spreadsheets, no accounts. Just your numbers and a clear picture.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/50">
              <CardContent className="pt-6">
                <feature.icon className="h-10 w-10 text-primary" />
                <h3 className="mt-4 font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

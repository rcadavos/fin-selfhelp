import { Card, CardContent } from "@/components/ui/card";
import { PieChart, ShoppingCart, Calculator, LayoutDashboard, ListChecks, ClipboardList, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedTextLoop } from "@/components/landing/animated-text-loop";


const features: {
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    title: "Log expenses daily",
    description:
      "Record any expense with a chosen date, category, and note. The date picker lets you label each entry for any day — past or present — so your spending history stays accurate.",
    icon: ListChecks,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Bills & payment tracking",
    description:
      "Add monthly, quarterly, or yearly recurring bills with due dates. Mark them paid as you go — status badges show Paid, Outstanding, or Unpaid at a glance, with a monthly summary of what's left.",
    icon: LayoutDashboard,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  {
    title: "Smart categories",
    description:
      "Grocery, rent, loans, utilities, savings, and more — organized the way Filipino households actually spend.",
    icon: PieChart,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    title: "To-buy list",
    description:
      "Shopping list with estimated prices so you know what you need and what it will cost before you head out.",
    icon: ShoppingCart,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    title: "To-do list",
    description:
      "Same flexible checklist as to-buy — errands and tasks with quantity and estimates when it helps you plan.",
    icon: ClipboardList,
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  {
    title: "Goal tracker",
    description:
      "Organize short-term, long-term, and lifetime goals, filter by achieved status, and track progress as you complete each one.",
    icon: Target,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    title: "Savings & debt calculators",
    description:
      "Compound savings and debt payoff timelines with Philippine-focused defaults.",
    icon: Calculator,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
];

export function FeaturesSection({ className }: { className?: string }) {
  return (
    <section id="features" className={cn("px-4 py-16 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <AnimatedTextLoop />
          <p className="mt-4 text-lg text-muted-foreground">
            Daily expenses, recurring bills, lists, goals, and calculators — the essentials you expect from a modern
            finance app, tuned for everyday Filipino household use.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="overflow-hidden border-border/60 bg-gradient-to-b from-card to-muted/20 shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="p-0">
                <div className="p-5">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", feature.iconBg)}>
                    <feature.icon className={cn("h-5 w-5", feature.iconColor)} />
                  </div>
                  <h3 className="mt-3 font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

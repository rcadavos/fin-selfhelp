import { Card, CardContent } from "@/components/ui/card";
import { PieChart, ShoppingCart, Calculator, LayoutDashboard, ListChecks, ClipboardList, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type DecorVariant = "checklist" | "chart" | "tags" | "receipt" | "coins" | "curve" | "goals";

function FeatureCardDecor({ variant }: { variant: DecorVariant }) {
  const base = "relative h-[72px] w-full overflow-hidden rounded-xl border border-white/10";
  switch (variant) {
    case "checklist":
      return (
        <div className={cn(base, "bg-gradient-to-br from-emerald-600/90 to-teal-800")}>
          <div className="absolute inset-0 flex flex-col justify-center gap-1.5 px-3">
            {[80, 55, 70].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px] text-white">✓</span>
                <div className="h-1.5 rounded-full bg-white/30" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>
      );
    case "chart":
      return (
        <div className={cn(base, "bg-gradient-to-br from-sky-600/90 to-indigo-900")}>
          <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-1">
            {[40, 65, 35, 80, 50].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm bg-white/35" style={{ height: `${h}%`, maxHeight: "48px" }} />
            ))}
          </div>
        </div>
      );
    case "tags":
      return (
        <div className={cn(base, "bg-gradient-to-br from-violet-600/90 to-fuchsia-900")}>
          <div className="absolute inset-0 flex flex-wrap content-center gap-1.5 p-2">
            {["Rent", "Loans", "Save"].map((t) => (
              <span key={t} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                {t}
              </span>
            ))}
          </div>
        </div>
      );
    case "receipt":
      return (
        <div className={cn(base, "bg-gradient-to-br from-amber-600/90 to-orange-900")}>
          <div className="absolute left-3 top-2 h-1 w-12 rounded-full bg-white/40" />
          <div className="absolute left-3 top-5 space-y-1">
            <div className="h-1 w-20 rounded-full bg-white/25" />
            <div className="h-1 w-16 rounded-full bg-white/20" />
            <div className="h-1 w-24 rounded-full bg-white/25" />
          </div>
          <div className="absolute bottom-2 right-2 rounded bg-white/25 px-1.5 py-0.5 text-[9px] font-bold text-white">
            PHP
          </div>
        </div>
      );
    case "coins":
      return (
        <div className={cn(base, "bg-gradient-to-br from-teal-600/90 to-emerald-950")}>
          <div className="absolute bottom-2 left-3 flex gap-1">
            <div className="h-8 w-8 rounded-full border-2 border-white/30 bg-white/15" />
            <div className="h-10 w-10 -translate-y-1 rounded-full border-2 border-white/40 bg-white/20" />
            <div className="h-7 w-7 rounded-full border-2 border-white/25 bg-white/10" />
          </div>
          <div className="absolute right-2 top-2 h-8 w-14 rounded-md bg-white/10" />
        </div>
      );
    case "goals":
      return (
        <div className={cn(base, "bg-gradient-to-br from-rose-600/90 to-orange-900")}>
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <div className="w-full space-y-1.5">
              <div className="h-2 w-full rounded-full bg-white/20">
                <div className="h-2 w-2/3 rounded-full bg-white/60" />
              </div>
              <div className="h-2 w-full rounded-full bg-white/20">
                <div className="h-2 w-1/2 rounded-full bg-white/45" />
              </div>
              <div className="h-2 w-full rounded-full bg-white/20">
                <div className="h-2 w-5/6 rounded-full bg-white/70" />
              </div>
            </div>
          </div>
        </div>
      );
    case "curve":
    default:
      return (
        <div className={cn(base, "bg-gradient-to-br from-blue-600/90 to-slate-900")}>
          <svg className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]" viewBox="0 0 100 40" preserveAspectRatio="none">
            <path
              d="M0 35 Q 25 30 50 18 T 100 5"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      );
  }
}

const features: {
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
  decor: DecorVariant;
}[] = [
  {
    title: "Track every bill",
    description:
      "List recurring and one-off expenses by category so nothing slips through the cracks before payday.",
    icon: ListChecks,
    decor: "checklist",
  },
  {
    title: "Payment dashboard",
    description:
      "Mark bills as paid each month and see paid vs unpaid at a glance — your own lightweight money app.",
    icon: LayoutDashboard,
    decor: "chart",
  },
  {
    title: "Smart categories",
    description:
      "Grocery, rent, loans, utilities, savings, and more — organized the way Filipino households actually spend.",
    icon: PieChart,
    decor: "tags",
  },
  {
    title: "To-buy list",
    description:
      "Shopping list with estimated prices so you know what you need and what it will cost before you head out.",
    icon: ShoppingCart,
    decor: "receipt",
  },
  {
    title: "To-do list",
    description:
      "Same flexible checklist as to-buy — errands and tasks with quantity and estimates when it helps you plan.",
    icon: ClipboardList,
    decor: "coins",
  },
  {
    title: "My Goals tracker",
    description:
      "Organize short-term, long-term, and lifetime goals, filter by achieved status, and track progress as you complete each one.",
    icon: Target,
    decor: "goals",
  },
  {
    title: "Savings & debt calculators",
    description:
      "Compound savings and debt payoff timelines with Philippine-focused defaults.",
    icon: Calculator,
    decor: "curve",
  },
];

export function FeaturesSection({ className }: { className?: string }) {
  return (
    <section id="features" className={cn("px-4 py-16 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your money, one clear dashboard
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Bills, budgets, lists, goals, and calculators — the essentials you expect from a modern finance app, tuned
            for everyday use.
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
                  <feature.icon className="h-8 w-8 text-primary" />
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

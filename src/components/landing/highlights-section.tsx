import { CalendarClock, Layers, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

const highlights = [
  {
    title: "Stay ahead of your bills",
    description: "Never miss a due date again.",
    icon: CalendarClock,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Reach your goals",
    description: "Track your progress and stay motivated — kahit paunti-unti.",
    icon: Layers,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    title: "See everything clearly",
    description: "Get a simple view of your life, not complicated charts.",
    icon: PiggyBank,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

export function HighlightsSection({ className }: { className?: string }) {
  return (
    <section
      id="highlights"
      className={cn("border-t bg-gradient-to-b from-muted/40 to-background px-4 py-14 sm:px-6 lg:px-8", className)}
    >
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
        {highlights.map(({ title, description, icon: Icon, iconBg, iconColor }) => (
          <div
            key={title}
            className="relative rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-sm"
          >
            <div className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-xl", iconBg)}>
              <Icon className={cn("h-5 w-5", iconColor)} aria-hidden />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

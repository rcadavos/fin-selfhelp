import { CalendarClock, Layers, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";

const highlights = [
  {
    title: "Monthly rhythm",
    description: "Mark bills paid each month and see what is still open — built around how you actually pay.",
    icon: CalendarClock,
  },
  {
    title: "Categories that fit life",
    description: "Rent, utilities, loans, savings, and more — organized so your dashboard stays readable.",
    icon: Layers,
  },
  {
    title: "Tools beyond bills",
    description: "To-buy and to-do lists, plus savings and debt calculators when you want the bigger picture.",
    icon: PiggyBank,
  },
];

export function HighlightsSection({ className }: { className?: string }) {
  return (
    <section
      id="highlights"
      className={cn("border-t bg-gradient-to-b from-muted/40 to-background px-4 py-14 sm:px-6 lg:px-8", className)}
    >
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
        {highlights.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            className="relative rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-sm"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

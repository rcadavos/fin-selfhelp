import { cn } from "@/lib/utils";

const highlights = [
  {
    title: "Stay ahead of your planned expenses",
    description: "Never miss a due date again.",
  },
  {
    title: "Reach your goals",
    description: "Track your progress and stay motivated — kahit paunti-unti.",
  },
  {
    title: "See everything clearly",
    description: "Get a simple view of your life, not complicated charts.",
  },
];

export function HighlightsSection({ className }: { className?: string }) {
  return (
    <section
      id="highlights"
      className={cn("border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24", className)}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-[20ch] text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem]">
          Built to keep you on track
        </h2>
        <div className="mt-10 grid grid-cols-1 border-t border-border sm:grid-cols-3 sm:border-t-0">
          {highlights.map((item, i) => (
            <div
              key={item.title}
              className={cn(
                "py-6 sm:px-6 sm:py-2",
                i > 0 && "border-t border-border sm:border-l sm:border-t-0",
                i === 0 && "sm:pl-0"
              )}
            >
              <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { cn } from "@/lib/utils";

const steps = [
  {
    step: 1,
    title: "Log expenses & planned expenses",
    description:
      "Record daily expenses with a date, category, and note. Add recurring planned expenses — monthly, quarterly, or yearly — and set due dates so nothing catches you off guard.",
  },
  {
    step: 2,
    title: "Get reminded, then mark paid",
    description:
      "Receive reminders before planned expenses are due. When you've settled one, tap to mark it paid — status badges update instantly to show Paid, Outstanding, or Unpaid.",
  },
  {
    step: 3,
    title: "Review your monthly summary",
    description:
      "Your dashboard shows total expenses, total planned expenses, what's still owed, and payment history across recent months — so you always know exactly where you stand.",
  },
];

export function HowItWorksSection({ className }: { className?: string }) {
  return (
    <section
      id="how-it-works"
      className={cn(
        "border-t bg-muted/30 px-4 py-16 sm:px-6 lg:px-8",
        className
      )}
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-muted-foreground">
            Three steps to a clearer view of your finances.
          </p>
        </div>
        <ul className="mt-12 space-y-0">
          {steps.map((item, idx) => (
            <li key={item.step} className="relative flex gap-6 pb-10 last:pb-0">
              {idx < steps.length - 1 && (
                <div className="absolute left-5 top-10 h-full w-px bg-gradient-to-b from-primary/40 to-transparent" aria-hidden />
              )}
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white shadow-md shadow-emerald-500/25">
                {item.step}
              </span>
              <div className="pt-1">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-muted-foreground">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

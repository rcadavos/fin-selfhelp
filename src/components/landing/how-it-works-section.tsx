import { cn } from "@/lib/utils";

const steps = [
  {
    step: 1,
    title: "Enter your income",
    description: "Add your monthly net take-home pay in PHP (or your currency).",
  },
  {
    step: 2,
    title: "Add your expenses",
    description:
      "Fill in what you spend per category—grocery, transport, loans, savings, etc. Select due date for recurring expenses with reminders.",
  },
  {
    step: 3,
    title: "See your result",
    description:
      "Get an instant view: overdraft, break-even, or money left over, plus a breakdown by category.",
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
        <ul className="mt-12 space-y-10">
          {steps.map((item) => (
            <li key={item.step} className="flex gap-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {item.step}
              </span>
              <div>
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

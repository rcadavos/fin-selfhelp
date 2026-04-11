import { cn } from "@/lib/utils";

const faqs: { q: string; a: string }[] = [
  {
    q: "What is OmniTrak?",
    a: "A personal finance hub focused on bills and cashflow: track expenses by category, mark what you paid each month, use to-buy and to-do lists, and calculators — tuned for everyday use in the Philippines.",
  },
  {
    q: "Is there a free tier?",
    a: "Yes. You can add a limited number of expenses and use the payment dashboard for free. Pro unlocks reminders, unlimited expenses, exports, and more.",
  },
  {
    q: "Can my partner see my data?",
    a: "You can invite someone by email and choose what they may view (your My Expenses and/or a to-buy list). They get read-only access with their own login.",
  },
  {
    q: "What currencies and formats are supported?",
    a: "You can pick currency and how dates and numbers display in Settings. Amounts work well with PHP and other major currencies.",
  },
  {
    q: "How do bill reminders work?",
    a: "On Pro, you can attach due dates and reminder windows to expenses. Reminders are sent by email according to the options you select on each bill.",
  },
  {
    q: "Do I need to link a bank?",
    a: "No. You enter bills and amounts yourself. That keeps setup simple and puts you in control of what appears on your dashboard.",
  },
];

export function FaqSection({ className }: { className?: string }) {
  return (
    <section id="faq" className={cn("border-t bg-muted/25 px-4 py-16 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Questions &amp; answers</h2>
          <p className="mt-3 text-muted-foreground">Straight answers before you sign up.</p>
        </div>
        <div className="mt-10 space-y-3">
          {faqs.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border border-border/80 bg-card px-4 py-1 shadow-sm open:shadow-md transition-shadow"
            >
              <summary className="cursor-pointer list-none py-4 font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  {q}
                  <span className="text-muted-foreground transition group-open:rotate-180" aria-hidden>
                    ▼
                  </span>
                </span>
              </summary>
              <p className="border-t border-border/60 pb-4 pt-0 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

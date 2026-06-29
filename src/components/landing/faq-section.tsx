import { cn } from "@/lib/utils";
import { TRIAL_DURATION_DAYS } from "@/lib/constants/trial";

const faqs: { q: string; a: string }[] = [
  {
    q: "What is OmniTrak?",
    a: "A personal finance hub focused on planned expenses and cashflow: track expenses by category, mark what you paid each month, manage goals, set reminders, and use calculators — tuned for everyday use in the Philippines.",
  },
  {
    q: "Do new accounts get a free trial?",
    a: `Yes. Every new account automatically starts with a ${TRIAL_DURATION_DAYS}-day Pro free trial — no card required. During the trial you get full Pro access, including email reminders, unlimited reminders, partner sharing, and custom expense categories. When the ${TRIAL_DURATION_DAYS} days are up, you move to the free plan automatically; upgrade anytime to keep Pro features.`,
  },
  {
    q: "What does the free plan include?",
    a: "Yes — you can use OmniTrak without a subscription or card: unlimited expense rows, the monthly paid dashboard, Goals tracking, due dates, and calculators. Reminders are limited to 10 items on free. Partner sharing, email reminders, unlimited reminders, and exports require Pro or Premium; Premium adds modules such as rent and payment trackers.",
  },
  {
    q: "Is there an AI assistant?",
    a: `Yes — "Ask OmniTrak" is a built-in AI assistant available on Pro and Premium (your ${TRIAL_DURATION_DAYS}-day Pro trial includes it). Open it from a floating button on any screen and ask about your budget, accounts, goals, or spending — it answers from your own data. You can also upload documents (PDF, text, Markdown) or add a website link and it will search them to answer, citing the sources. Nothing is shared with other users.`,
  },
  {
    q: "How does Goals work?",
    a: "Goals lets you create short-term, long-term, and lifetime goals, filter by achieved or not yet achieved, and mark goals as achieved with progress reflected immediately in your list.",
  },
  {
    q: "Can my partner see my data?",
    a: "With Pro or Premium (active on your account), you can invite someone by email and choose what they may view—your Planned Expenses and/or your Reminders. They sign in with their own OmniTrak account and get the access you grant; they cannot change your planned expense amounts.",
  },
  {
    q: "What currencies and formats are supported?",
    a: "You can pick currency and how dates and numbers display in Settings. Amounts work well with PHP and other major currencies.",
  },
  {
    q: "How do planned expense reminders work?",
    a: "All plans can attach due dates to planned expenses. With Pro or Premium (and an active subscription), you can also enable email reminder windows for each planned expense. Reminders are sent by email according to the options you pick. The free plan does not include email reminders.",
  },
  {
    q: "Do I need to link a bank?",
    a: "No. You enter planned expenses and amounts yourself. That keeps setup simple and puts you in control of what appears on your dashboard.",
  },
];

export function FaqSection({ className }: { className?: string }) {
  return (
    <section id="faq" className={cn("border-t bg-muted/25 px-4 py-16 sm:px-6 lg:px-8", className)}>
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Frequently Asked Questions</h2>
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
              <p className="border-t border-border/60 pb-4 pt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

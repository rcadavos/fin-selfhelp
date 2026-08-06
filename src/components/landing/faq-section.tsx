import { cn } from "@/lib/utils";
import { TRIAL_DURATION_DAYS } from "@/lib/constants/trial";
import {
  REFERRAL_CONVERSION_REWARD_MONTHS,
  REFERRAL_SIGNUPS_PER_REWARD,
  REFERRAL_SIGNUP_REWARD_MONTHS,
} from "@/lib/constants/referral";
import { ChevronDown } from "lucide-react";

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
    q: "How does the referral program work?",
    a: `Every account gets a personal invite link. For every ${REFERRAL_SIGNUPS_PER_REWARD} friends who sign up through it you earn ${REFERRAL_SIGNUP_REWARD_MONTHS} free month of Pro, and that stacks — 10 friends is 2 months, 15 is 3. On top of that, every referred friend who upgrades to a paid plan earns you ${REFERRAL_CONVERSION_REWARD_MONTHS} more free month, once per friend. Rewards are added automatically and extend from whenever your Pro access currently ends, so nothing is wasted and there is nothing to claim.`,
  },
  {
    q: "What does the free plan include?",
    a: "You can use OmniTrak without a subscription or card: unlimited expense rows, the monthly paid dashboard, Goals tracking, due dates, and calculators. Reminders are limited to 5 items on free. Partner sharing, email reminders, unlimited reminders, and exports require Pro or Premium; Premium adds modules such as rent and payment trackers.",
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
    <section
      id="faq"
      className={cn("border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-24", className)}
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem]">
              Frequently asked questions
            </h2>
            <p className="mt-3 max-w-[30ch] text-muted-foreground">
              Straight answers before you sign up.
            </p>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="border-t border-border">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                  <span>{q}</span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden
                  />
                </summary>
                <p className="max-w-[62ch] pb-4 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

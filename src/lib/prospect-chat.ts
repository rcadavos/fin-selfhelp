// Curated answers for the prospect chat's suggested questions. These answer
// instantly and without an AI call, so the three things every visitor asks are
// always right and always free to serve. Prices come from the live plan rows the
// landing page already loads.

import type { SubscriptionPlanRow } from "@/actions/subscription-plan";
import { formatCurrency } from "@/lib/utils";
import { LEGAL_ROUTES } from "@/lib/legal-routes";
import { TRIAL_DURATION_DAYS } from "@/lib/constants/trial";
import { PRODUCT_NAME, type ProspectSuggestionId } from "@/lib/constants/prospect-chat";

export type ProspectPlans = { pro: SubscriptionPlanRow; premium: SubscriptionPlanRow };

export type ProspectAnswerLink = { label: string; href: string };
export type ProspectAnswer = { text: string; links: ProspectAnswerLink[] };

/** "US$3.00 per month" — used by the curated answers and the AI's fact sheet. */
export function formatPlanPrice(plan: SubscriptionPlanRow): string {
  return `${formatCurrency(plan.priceAmount, plan.priceCurrency)} per ${plan.interval}`;
}

const SIGNUP_LINK: ProspectAnswerLink = { label: "Create a free account", href: "/signup" };

export function buildSuggestionAnswer(
  id: ProspectSuggestionId,
  plans: ProspectPlans,
): ProspectAnswer {
  switch (id) {
    case "what-it-does":
      return {
        text: [
          `${PRODUCT_NAME} keeps your everyday money in one place, built for life in the Philippines:`,
          "",
          "• Log expenses in seconds — they sort themselves by category",
          "• Track bills with due dates, paid stamps and a payment history",
          "• Save toward goals and watch your progress on the dashboard",
          "• Get reminders before anything is due",
          "• Ask the built-in AI assistant about your own budget and spending (Pro)",
          "",
          "The tax, savings and debt-payoff calculators are free to use — no account needed.",
        ].join("\n"),
        links: [SIGNUP_LINK],
      };

    case "pricing": {
      const lines = [
        "Yes — the free plan has no time limit and needs no card. It covers unlimited expense and bill entries, due dates, goals, the calculators and up to 5 reminders.",
      ];
      if (plans.pro.enabled) {
        lines.push(
          "",
          `Pro (${formatPlanPrice(plans.pro)}) adds:`,
          "• The AI assistant for your finances and documents",
          "• Email reminders and unlimited reminders",
          "• Partner sharing and custom categories",
        );
      }
      if (plans.premium.enabled) {
        lines.push(
          "",
          `Premium (${formatPlanPrice(plans.premium)}) adds the Rent Tracker and Payment Tracker on top of everything in Pro.`,
        );
      }
      lines.push(
        "",
        `Every new account starts with a ${TRIAL_DURATION_DAYS}-day Pro free trial — no card required.`,
      );
      return {
        text: lines.join("\n"),
        links: [
          { label: "Start the free trial", href: "/signup" },
          { label: "Compare plans", href: "#subscribe" },
        ],
      };
    }

    case "bank-linking":
      return {
        text: [
          "No. You add your bills and amounts yourself, so there are no bank logins to hand over, and you decide exactly what shows on your dashboard.",
          "",
          "Your data stays private to your account and we don't sell it. If you invite a partner, they only see what you choose to share — your Bills, your Reminders, or both — and they can't change your amounts.",
        ].join("\n"),
        links: [{ label: "Read the privacy policy", href: LEGAL_ROUTES.privacy }],
      };
  }
}

import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Debt Payoff Calculator",
  description:
    "See when you'll be debt-free. Enter balance, interest rate, and monthly payment; get payoff date and total interest.",
  path: "/dashboard/calculators/debt-payoff",
});

export default function DebtPayoffCalculatorLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}

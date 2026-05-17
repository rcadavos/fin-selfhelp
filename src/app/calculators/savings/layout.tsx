import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Savings Calculator",
  description:
    "Project future value of savings with compound interest. Philippine-focused defaults (time deposit, inflation).",
  path: "/calculators/savings",
});

export default function SavingsCalculatorLayout({
  children,
}: { children: React.ReactNode }) {
  return <>{children}</>;
}
